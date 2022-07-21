import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { StripeService } from "../common/stripe.service";
import { Result } from "src/core/logic/Result";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { PaymentProviders } from "./domain/PaymentProviderDetails";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import Stripe from "stripe";
import { PaymentMethods } from "./domain/PaymentMethods";
import Checkout from "checkout-sdk-node";
import { CheckoutService } from "../common/checkout.service";
import { EmailService } from "../common/email.service";
import { CheckoutPaymentStatus, FiatTransactionStatus } from "./domain/Types";
import { PaymentMethodStatus } from "./domain/VerificationStatus";
import { CryptoWallets } from "./domain/CryptoWallets";

@Injectable()
export class ConsumerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("ConsumerRepo")
  private readonly consumerRepo: IConsumerRepo;

  @Inject()
  private readonly emailService: EmailService;

  private readonly stripeApi: Stripe;
  private readonly checkoutApi: Checkout;

  constructor(private readonly stripeService: StripeService, private readonly checkoutService: CheckoutService) {
    this.stripeApi = stripeService.stripeApi;
    // TODO: Move these configurations to yaml files
    this.checkoutApi = checkoutService.checkoutApi;
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  async createConsumerIfFirstTimeLogin(emailOrPhone: string, partnerID: string): Promise<Consumer> {
    const isEmail = emailOrPhone.includes("@");
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;

    const consumerResult = await this.findConsumerByEmailOrPhone(emailOrPhone);
    if (consumerResult.isFailure) {
      //user doesn't exist already
      //first create stripe customer
      this.logger.info(`Creating user for first time for ${emailOrPhone}`);
      const stripeCustomer = await this.stripeService.stripeApi.customers.create({ email: email, phone: phone });
      const stripeCustomerID = stripeCustomer.id;

      const newConsumer = Consumer.createConsumer({
        email,
        phone,
        paymentProviderAccounts: [
          {
            providerCustomerID: stripeCustomerID,
            providerID: PaymentProviders.STRIPE,
          },
        ],
        partners: [
          {
            partnerID: partnerID,
          },
        ],
      });
      const result = await this.consumerRepo.createConsumer(newConsumer);
      await this.emailService.sendWelcomeMessage(emailOrPhone, result.props.firstName, result.props.lastName);
      return result;
    } else if (
      consumerResult.getValue().props.partners.filter(partner => partner.partnerID === partnerID).length === 0
    ) {
      return this.updateConsumer({
        ...consumerResult.getValue().props,
        partners: [
          ...consumerResult.getValue().props.partners,
          {
            partnerID: partnerID,
          },
        ],
      });
    }

    return consumerResult.getValue();
  }

  async updateConsumer(consumerProps: Partial<ConsumerProps>): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerProps._id);
    const updatedConsumer = await this.consumerRepo.updateConsumer(
      Consumer.createConsumer({
        ...consumer.props,
        ...consumerProps,
      }),
    );
    return updatedConsumer;
  }

  async findConsumerByEmailOrPhone(emailOrPhone: string): Promise<Result<Consumer>> {
    const isEmail = emailOrPhone.includes("@");
    const consumerResult = isEmail
      ? await this.consumerRepo.getConsumerByEmail(emailOrPhone)
      : await this.consumerRepo.getConsumerByPhone(emailOrPhone);
    return consumerResult;
  }

  async findConsumerById(consumerId: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerId);
  }

  async addStripePaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO): Promise<Consumer> {
    const stripeCustomerID = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProviders.STRIPE,
    )[0].providerCustomerID;

    //TODO expand for other payment methods when needed
    const params: Stripe.PaymentMethodCreateParams = {
      type: "card",
      card: {
        number: paymentMethod.cardNumber,
        exp_month: paymentMethod.expiryMonth,
        exp_year: paymentMethod.expiryYear,
        cvc: paymentMethod.cvv,
      },
    };

    //first create payment method and then attach it to customer
    const stripePaymentMethod = await this.stripeApi.paymentMethods.create(params);
    //attach the payment method to the customer
    await this.stripeApi.paymentMethods.attach(stripePaymentMethod.id, { customer: stripeCustomerID });

    const newPaymentMethod: PaymentMethods = {
      cardName: paymentMethod.cardName,
      cardType: "card",
      first6Digits: paymentMethod.cardNumber.substring(0, 6),
      last4Digits: paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
      imageUri: paymentMethod.imageUri,
      paymentToken: stripePaymentMethod.id,
      paymentProviderID: PaymentProviders.STRIPE,
    };
    // Update user details
    const updatedConsumerData: ConsumerProps = {
      ...consumer.props,
      paymentMethods: [...consumer.props.paymentMethods, newPaymentMethod],
    };
    return this.consumerRepo.updateConsumer(Consumer.createConsumer(updatedConsumerData));
  }

  async addCheckoutPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO): Promise<Consumer> {
    // TODO Populate checkout customer id in create user
    const checkoutCustomerData = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProviders.CHECKOUT,
    );

    let checkoutCustomerID;

    let hasCustomerIDSaved = true;

    if (checkoutCustomerData.length === 0) {
      // new customer. Create customer id
      hasCustomerIDSaved = false;
      try {
        const checkoutCustomer = await this.checkoutApi.customers.create({
          email: consumer.props.email,
          metadata: {
            coupon_code: "NY2018",
            partner_id: 123989,
          },
        });

        checkoutCustomerID = checkoutCustomer["id"];
      } catch (e) {
        if (e.body["error_codes"].filter(errorCode => errorCode === "customer_email_already_exists").length > 0) {
          // existing customer
          const checkoutCustomer = await this.checkoutApi.customers.get(consumer.props.email);
          checkoutCustomerID = checkoutCustomer["id"];
        } else {
          throw new BadRequestException("Failed to create checkout customer");
        }
      }
    } else {
      checkoutCustomerID = checkoutCustomerData[0].providerCustomerID;
    }

    try {
      // To add payment method, we first need to tokenize the card
      // Token is only valid for 15 mins
      const token = await this.checkoutApi.tokens.request({
        type: "card",
        number: paymentMethod.cardNumber,
        expiry_month: paymentMethod.expiryMonth,
        expiry_year: paymentMethod.expiryYear,
        cvv: paymentMethod.cvv,
      });

      // Now create instrument
      const instrument = await this.checkoutApi.instruments.create({
        // infered type "token",
        token: token["token"], // Generated by Checkout.Frames
        customer: {
          id: checkoutCustomerID,
        },
      });

      let paymentMethodStatus: PaymentMethodStatus = undefined;
      // Check if added payment method is valid
      try {
        const payment = await this.checkoutApi.payments.request({
          currency: "USD", // TODO: Figure out if we need to move to non hardcoded value
          source: {
            type: "id",
            id: instrument["id"],
          },
          description: "Noba Customer Payment at UTC " + Date.now(),
          metadata: {
            order_id: "test_order_1",
          },
        });
        if (payment["risk"]["flagged"]) {
          paymentMethodStatus = PaymentMethodStatus.REJECTED;
        } else {
          paymentMethodStatus = PaymentMethodStatus.APPROVED;
        }
      } catch (err) {
        //pass
        this.logger.error(`Failed to make payment while adding card: ${err}`);
      }

      const newPaymentMethod: PaymentMethods = {
        cardName: paymentMethod.cardName,
        cardType: instrument["scheme"],
        first6Digits: paymentMethod.cardNumber.substring(0, 6),
        last4Digits: paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
        imageUri: paymentMethod.imageUri,
        paymentProviderID: PaymentProviders.CHECKOUT,
        paymentToken: instrument["id"], // TODO: Check if this is the valid way to populate id
      };

      if (paymentMethodStatus) {
        newPaymentMethod.status = paymentMethodStatus;
      }

      let updatedConsumerProps: ConsumerProps;
      if (hasCustomerIDSaved) {
        updatedConsumerProps = {
          ...consumer.props,
          paymentMethods: [...consumer.props.paymentMethods, newPaymentMethod],
        };
      } else {
        updatedConsumerProps = {
          ...consumer.props,
          paymentMethods: [...consumer.props.paymentMethods, newPaymentMethod],
          paymentProviderAccounts: [
            ...consumer.props.paymentProviderAccounts,
            {
              providerID: PaymentProviders.CHECKOUT,
              providerCustomerID: checkoutCustomerID,
            },
          ],
        };
      }

      const result = await this.consumerRepo.updateConsumer(Consumer.createConsumer(updatedConsumerProps));
      await this.emailService.sendCardAddedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        newPaymentMethod.cardType,
        newPaymentMethod.last4Digits,
      );
      return result;
    } catch (e) {
      await this.emailService.sendCardAdditionFailedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        /* cardNetwork = */ "",
        paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
      );
      throw new BadRequestException("Card details are not valid");
    }
  }

  async requestCheckoutPayment(
    paymentToken: string,
    amount: number,
    currency: string,
    nobaTransactionId: string,
  ): Promise<any> {
    try {
      const payment = await this.checkoutApi.payments.request({
        amount: amount * 100, // this is amount in cents so if we write 1 here it means 0.01 USD
        currency: currency,
        source: {
          type: "id",
          id: paymentToken,
        },
        description: "Noba Customer Payment at UTC " + Date.now(),
        metadata: {
          order_id: nobaTransactionId,
        },
      });
      return payment;
    } catch (err) {
      throw new BadRequestException("Payment processing failed");
    }
  }

  async getFiatPaymentStatus(paymentId: string, paymentProvider: PaymentProviders): Promise<FiatTransactionStatus> {
    try {
      //TODO status check based on the payment provider
      const payment = await this.checkoutApi.payments.get(paymentId);
      this.logger.info(`Payment status for payment ${paymentId} is ${payment.status}`);
      const status: CheckoutPaymentStatus = payment.status;
      if (status === "Captured") return FiatTransactionStatus.CAPTURED;
      if (status === "Pending") return FiatTransactionStatus.PENDING;
      return FiatTransactionStatus.FAILED;
    } catch (err) {
      throw new Error("Error while checking payment status from payment id " + paymentId + " " + err);
    }
  }

  async updatePaymentMethod(consumerID: string, paymentMethod: PaymentMethods): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherPaymentMethods = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken !== paymentMethod.paymentToken,
    );
    return await this.updateConsumer({
      ...consumer.props,
      paymentMethods: [...otherPaymentMethods, paymentMethod],
    });
  }

  async addOrUpdateCryptoWallet(consumerID: string, cryptoWallet: CryptoWallets): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      cryptoWallet => cryptoWallet.address !== cryptoWallet.address,
    );

    return await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets, cryptoWallet],
    });
  }

  async removePaymentMethod(consumer: Consumer, paymentToken: string): Promise<Consumer> {
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === paymentToken,
    );
    if (paymentMethod.length === 0) {
      throw new NotFoundException("Payment Method id not found");
    }

    const paymentProviderID = paymentMethod[0].paymentProviderID;

    if (paymentProviderID === PaymentProviders.STRIPE) {
      await this.stripeApi.paymentMethods.detach(paymentToken);
    } else if (paymentProviderID === PaymentProviders.CHECKOUT) {
      await this.checkoutApi.instruments.delete(paymentToken);
    } else {
      throw new NotFoundException("Payment provider not found");
    }

    const filteredPaymentMethods = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken !== paymentToken,
    );

    const updatedConsumer: ConsumerProps = {
      ...consumer.props,
      paymentMethods: filteredPaymentMethods,
    };

    const result = await this.updateConsumer(updatedConsumer);

    await this.emailService.sendCardDeletedEmail(
      consumer.props.firstName,
      consumer.props.lastName,
      consumer.props.email,
      paymentMethod[0].cardType,
      paymentMethod[0].last4Digits,
    );
    return result;
  }

  getVerificationStatus(consumer: Consumer): UserVerificationStatus {
    // TODO: Write logic for verification status based on current modifications of users verification data
    throw new Error("Method not implemented");
  }
}
