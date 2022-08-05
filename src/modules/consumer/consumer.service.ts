import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Result } from "src/core/logic/Result";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { PaymentProviders } from "./domain/PaymentProviderDetails";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import Stripe from "stripe";
import { PaymentMethod } from "./domain/PaymentMethod";
import Checkout from "checkout-sdk-node";
import { CheckoutService } from "../common/checkout.service";
import { EmailService } from "../common/email.service";
import { CheckoutPaymentStatus, FiatTransactionStatus } from "./domain/Types";
import { PaymentMethodStatus } from "./domain/VerificationStatus";
import { CryptoWallet } from "./domain/CryptoWallet";
import { KmsService } from "../common/kms.service";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import {
  REASON_CODE_SOFT_DECLINE_BANK_ERROR,
  REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA,
  REASON_CODE_SOFT_DECLINE_CARD_ERROR,
} from "../transactions/domain/CheckoutConstants";

@Injectable()
export class ConsumerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("ConsumerRepo")
  private readonly consumerRepo: IConsumerRepo;

  @Inject()
  private readonly emailService: EmailService;

  @Inject()
  private readonly kmsService: KmsService;

  private readonly stripeApi: Stripe;
  private readonly checkoutApi: Checkout;

  constructor(private readonly checkoutService: CheckoutService) {
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
      const newConsumer = Consumer.createConsumer({
        email: email.toLowerCase(),
        displayEmail: email,
        phone,
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
      ? await this.consumerRepo.getConsumerByEmail(emailOrPhone.toLowerCase())
      : await this.consumerRepo.getConsumerByPhone(emailOrPhone);
    return consumerResult;
  }

  async findConsumerById(consumerId: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerId);
  }

  async addCheckoutPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO): Promise<Consumer> {
    const checkoutCustomerData = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProviders.CHECKOUT,
    );

    let checkoutCustomerID: string;
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

    let paymentMethodStatus: PaymentMethodStatus = undefined;
    let instrumentID;
    let cardType;
    let payment;
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

      instrumentID = instrument["id"];
      cardType = instrument["scheme"];
    } catch (err) {
      //pass
      this.logger.error(`Failed to make payment while adding card: ${err}`);
    }

    // Check if this card already exists for the consumer
    const existingPaymentMethod = consumer.getPaymentMethodByID(instrumentID);
    if (existingPaymentMethod) {
      throw new BadRequestException({ message: "Card already added" });
    }

    try {
      // Check if added payment method is valid
      payment = await this.checkoutApi.payments.request({
        currency: "USD", // TODO: Figure out if we need to move to non hardcoded value
        source: {
          type: "id",
          id: instrumentID,
        },
        description: "Noba Customer Preauth at UTC " + Date.now(),
        metadata: {
          order_id: "test_order_1",
        },
      });
    } catch (err) {
      //pass
      this.logger.error(`Failed to make payment while adding card: ${err}`);
    }

    const responseCode: string = payment["response_code"];
    const responseSummary = payment["response_summary"];
    this.logger.info(`Card add response: ${responseCode} - ${responseSummary}`);

    if (!responseCode) {
      // TODO throw error
    } else if (responseCode.startsWith("10")) {
      // Accepted
      paymentMethodStatus = PaymentMethodStatus.APPROVED;
    } else if (responseCode.startsWith("20")) {
      // Soft decline, with several categories
      if (REASON_CODE_SOFT_DECLINE_CARD_ERROR.indexOf(responseCode) > -1) {
        // Card error, possibly bad number, user should confirm details
        throw new BadRequestException({ message: "Invalid card data" });
      } else if (REASON_CODE_SOFT_DECLINE_BANK_ERROR.indexOf(responseCode) > -1) {
        throw new BadRequestException({ message: "Invalid card data" });
      } else if (REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA.indexOf(responseCode)) {
        this.emailService.sendHardDeclineEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
          "xxx",
          instrumentID,
          "Checkout",
          responseCode,
          responseSummary,
        );
        throw new BadRequestException({ message: "Invalid card data" });
      }
    } else if (responseCode.startsWith("30")) {
      // Hard decline
      this.emailService.sendHardDeclineEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        "xxx",
        instrumentID,
        "Checkout",
        responseCode,
        JSON.stringify(payment),
      );

      paymentMethodStatus = PaymentMethodStatus.REJECTED;
    } else if (responseCode.startsWith("40") || payment["risk"]["flagged"]) {
      this.emailService.sendHardDeclineEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        "xxx",
        instrumentID,
        "Checkout",
        responseCode,
        responseSummary,
      );
      // Risk
      paymentMethodStatus = PaymentMethodStatus.REJECTED;
    } else {
      // Should never get here, but log if we do
    }

    if (paymentMethodStatus === PaymentMethodStatus.REJECTED) {
      await this.emailService.sendCardAdditionFailedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        /* cardNetwork = */ "",
        paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
      );
      throw new BadRequestException({ message: "Rejected card" }, "This card won't work");
    } else if (paymentMethodStatus === PaymentMethodStatus.FLAGGED) {
      // TODO
    } else {
      const newPaymentMethod: PaymentMethod = {
        cardName: paymentMethod.cardName,
        cardType: cardType,
        first6Digits: paymentMethod.cardNumber.substring(0, 6),
        last4Digits: paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
        imageUri: paymentMethod.imageUri,
        paymentProviderID: PaymentProviders.CHECKOUT,
        paymentToken: instrumentID, // TODO: Check if this is the valid way to populate id
        authCode: responseCode,
        authReason: responseSummary,
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
        consumer.props.displayEmail,
        newPaymentMethod.cardType,
        newPaymentMethod.last4Digits,
      );
      return result;
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
      const payment = await this.checkoutApi.payments.get(paymentId);
      const status: CheckoutPaymentStatus = payment.status;
      if (status === "Authorized" || status === "Paid") return FiatTransactionStatus.AUTHORIZED;
      if (status === "Captured" || status === "Partially Captured") return FiatTransactionStatus.CAPTURED;
      if (status === "Pending") return FiatTransactionStatus.PENDING;

      this.logger.error(`Payment ${paymentId} failed fiat processing with status ${status}`);
      return FiatTransactionStatus.FAILED;
    } catch (err) {
      throw new Error("Error while checking payment status from payment id " + paymentId + " " + err);
    }
  }

  async updatePaymentMethod(consumerID: string, paymentMethod: PaymentMethod): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherPaymentMethods = consumer.props.paymentMethods.filter(
      existingPaymentMethod => existingPaymentMethod.paymentToken !== paymentMethod.paymentToken,
    );
    return await this.updateConsumer({
      ...consumer.props,
      paymentMethods: [...otherPaymentMethods, paymentMethod],
    });
  }

  async addOrUpdateCryptoWallet(consumerID: string, cryptoWallet: CryptoWallet): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWallet.address,
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
      consumer.props.displayEmail,
      paymentMethod[0].cardType,
      paymentMethod[0].last4Digits,
    );
    return result;
  }

  // Be VERY cautious about using this. We should only need it to send to ZeroHash.
  async getDecryptedSSN(consumer: ConsumerProps) {
    return await this.kmsService.decryptString(consumer.socialSecurityNumber, KmsKeyType.SSN);
  }

  async addZeroHashParticipantCode(consumerID: string, zeroHashParticipantCode: string): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);

    return await this.updateConsumer({
      ...consumer.props,
      zhParticipantCode: zeroHashParticipantCode,
    });
  }

  getVerificationStatus(consumer: Consumer): UserVerificationStatus {
    // TODO: Write logic for verification status based on current modifications of users verification data
    throw new Error("Method not implemented");
  }
}
