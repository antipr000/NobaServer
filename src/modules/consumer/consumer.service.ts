import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Result } from "../../core/logic/Result";
import Stripe from "stripe";
import { Logger } from "winston";
import { IOTPRepo } from "../auth/repo/OTPRepo";
import { CheckoutService } from "../common/checkout.service";
import { EmailService } from "../common/email.service";
import { KmsService } from "../common/kms.service";
import {
  REASON_CODE_SOFT_DECLINE_BANK_ERROR,
  REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA,
  REASON_CODE_SOFT_DECLINE_CARD_ERROR,
  REASON_CODE_SOFT_DECLINE_NO_CRYPTO,
} from "../transactions/domain/CheckoutConstants";
import { Transaction } from "../transactions/domain/Transaction";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { PaymentMethod } from "./domain/PaymentMethod";
import { PaymentProviders } from "./domain/PaymentProviderDetails";
import { CheckoutPaymentStatus, FiatTransactionStatus, PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { PaymentMethodStatus, WalletStatus } from "./domain/VerificationStatus";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { CardFailureExceptionText, CardProcessingException } from "./CardProcessingException";
import { CreditCardService } from "../common/creditcard.service";
import { BINValidity } from "../common/dto/CreditCardDTO";
import { Utils } from "../../core/utils/Utils";

class CheckoutResponseData {
  paymentMethodStatus: PaymentMethodStatus;
  responseCode: string;
  responseSummary: string;
}
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

  @Inject()
  private readonly creditCardService: CreditCardService;

  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  private readonly stripeApi: Stripe;
  private readonly checkoutApi: Checkout;

  constructor(private readonly checkoutService: CheckoutService) {
    this.checkoutApi = checkoutService.checkoutAPI;
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  async createConsumerIfFirstTimeLogin(
    emailOrPhone: string,
    partnerID: string,
    partnerUserID?: string,
  ): Promise<Consumer> {
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
            partnerUserID: partnerUserID,
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
            partnerUserID: partnerUserID,
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

    let instrumentID: string;
    let cardType: string;
    let checkoutResponse;
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
      this.logger.error(`Failed to add card card: ${err}`);
      throw new BadRequestException({ message: "Failed to add card" });
    }

    // Check if this card already exists for the consumer
    const existingPaymentMethod = consumer.getPaymentMethodByID(instrumentID);
    if (existingPaymentMethod) {
      throw new BadRequestException({ message: "Card already added" });
    }

    try {
      // Check if added payment method is valid
      checkoutResponse = await this.checkoutApi.payments.request({
        amount: 100,
        currency: "USD", // TODO: Figure out if we need to move to non hardcoded value
        source: {
          type: "id",
          id: instrumentID,
        },
        description: "Noba Customer card validation at UTC " + Date.now(),
        metadata: {
          order_id: "test_order_1",
        },
        capture: false,
      });
    } catch (err) {
      //pass
      this.logger.error(`Error validating card instrument ${instrumentID}: ${err}`);
      throw new BadRequestException("Card validation error");
    }

    let response: CheckoutResponseData;
    try {
      response = await this.handleCheckoutResponse(
        consumer,
        checkoutResponse,
        instrumentID,
        paymentMethod.cardNumber,
        "verification",
        "verification",
      );
    } catch (e) {
      if (e instanceof CardProcessingException) {
        throw new BadRequestException(e.message);
      } else {
        throw new BadRequestException("Unable to add card at this time");
      }
    }

    if (response.paymentMethodStatus === PaymentMethodStatus.REJECTED) {
      await this.emailService.sendCardAdditionFailedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        /* cardNetwork = */ "",
        paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
      );
      throw new BadRequestException(CardFailureExceptionText.DECLINE);
    } else if (response.paymentMethodStatus === PaymentMethodStatus.FLAGGED) {
      // TODO - we don't currently have a use case for FLAGGED
    } else {
      const newPaymentMethod: PaymentMethod = {
        cardName: paymentMethod.cardName,
        cardType: cardType,
        first6Digits: paymentMethod.cardNumber.substring(0, 6),
        last4Digits: paymentMethod.cardNumber.substring(paymentMethod.cardNumber.length - 4),
        imageUri: paymentMethod.imageUri,
        paymentProviderID: PaymentProviders.CHECKOUT,
        paymentToken: instrumentID,
        authCode: response.responseCode,
        authReason: response.responseSummary,
      };

      if (response.paymentMethodStatus) {
        newPaymentMethod.status = response.paymentMethodStatus;
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

      if (response.paymentMethodStatus === PaymentMethodStatus.UNSUPPORTED) {
        // Do we want to send a different email here too? Currently just throw up to the UI as a 400.
        // Note that we are intentionally saving the payment method with this UNSUPPORTED status as
        // we may want to let the user know some day when their bank allows crypto.
        throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
      }

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

  async requestCheckoutPayment(consumer: Consumer, transaction: Transaction): Promise<PaymentRequestResponse> {
    let checkoutResponse;
    try {
      checkoutResponse = await this.checkoutApi.payments.request(
        {
          amount: Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100, // this is amount in cents so if we write 1 here it means 0.01 USD
          currency: transaction.props.leg1,
          source: {
            type: "id",
            id: transaction.props.paymentMethodID,
          },
          description: "Noba Customer Payment at UTC " + Date.now(),
          metadata: {
            order_id: transaction.props._id,
          },
        },
        /*idempotencyKey=*/ transaction.props._id,
      );
    } catch (err) {
      this.logger.error(
        `Exception while requesting checkout payment for transaction id ${transaction.props._id}: ${err.message}`,
      );
      throw err;
    }

    const response = await this.handleCheckoutResponse(
      consumer,
      checkoutResponse,
      transaction.props.paymentMethodID,
      null,
      transaction.props.sessionKey,
      transaction.props._id,
    );

    switch (response.paymentMethodStatus) {
      case PaymentMethodStatus.APPROVED:
        return { status: response.paymentMethodStatus, paymentID: checkoutResponse["id"] };
      case PaymentMethodStatus.REJECTED:
        return {
          status: response.paymentMethodStatus,
          responseCode: response.responseCode,
          responseSummary: response.responseSummary,
        };
      case PaymentMethodStatus.FLAGGED:
      // TODO: Don't yet have a use for this?
    }
  }

  async handleCheckoutResponse(
    consumer: Consumer,
    checkoutResponse: string,
    instrumentID: string,
    cardNumber: string,
    sessionID: string,
    transactionID: string,
  ): Promise<CheckoutResponseData> {
    const response: CheckoutResponseData = new CheckoutResponseData();
    response.responseCode = checkoutResponse["response_code"];
    response.responseSummary = checkoutResponse["response_summary"];
    let sendNobaEmail = false;

    try {
      if (!response.responseCode) {
        this.logger.error(`No response code received validating card instrument ${instrumentID}`);
        throw new CardProcessingException(CardFailureExceptionText.ERROR);
      } else if (response.responseCode.startsWith("10")) {
        // If all else was good, we must also check against the list of cards which we know
        // don't accept crypto as that may change *OUR* decision as to whether or not to
        // accept the card.
        if (cardNumber != null) {
          // Don't know it at transaction time
          const validity: BINValidity = await this.creditCardService.isBINSupported(cardNumber);
          if (validity === BINValidity.NOT_SUPPORTED) {
            response.paymentMethodStatus = PaymentMethodStatus.UNSUPPORTED;
          } else {
            // supported or unknown
            response.paymentMethodStatus = PaymentMethodStatus.APPROVED;
          }
        } else {
          response.paymentMethodStatus = PaymentMethodStatus.APPROVED;
        }
      } else if (response.responseCode.startsWith("20")) {
        // Soft decline, with several categories
        if (REASON_CODE_SOFT_DECLINE_CARD_ERROR.indexOf(response.responseCode) > -1) {
          // Card error, possibly bad number, user should confirm details
          throw new CardProcessingException(
            CardFailureExceptionText.SOFT_DECLINE,
            response.responseCode,
            response.responseSummary,
          );
        } else if (REASON_CODE_SOFT_DECLINE_BANK_ERROR.indexOf(response.responseCode) > -1) {
          throw new CardProcessingException(
            CardFailureExceptionText.SOFT_DECLINE,
            response.responseCode,
            response.responseSummary,
          );
        } else if (REASON_CODE_SOFT_DECLINE_NO_CRYPTO.indexOf(response.responseCode)) {
          throw new CardProcessingException(
            CardFailureExceptionText.NO_CRYPTO,
            response.responseCode,
            response.responseSummary,
          );
        } else if (REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA.indexOf(response.responseCode)) {
          sendNobaEmail = true;
          throw new CardProcessingException(
            CardFailureExceptionText.SOFT_DECLINE,
            response.responseCode,
            response.responseSummary,
          );
        }
      } else if (response.responseCode.startsWith("30")) {
        // Hard decline
        sendNobaEmail = true;
        response.paymentMethodStatus = PaymentMethodStatus.REJECTED;
      } else if (response.responseCode.startsWith("40") || checkoutResponse["risk"]["flagged"]) {
        // Risk
        sendNobaEmail = true;
        response.paymentMethodStatus = PaymentMethodStatus.REJECTED;
      } else {
        // Should never get here, but log if we do
        this.logger.error(
          `Unknown response code '${response.responseCode}' received when validating card instrument ${instrumentID}`,
        );
        throw new CardProcessingException(
          CardFailureExceptionText.ERROR,
          response.responseCode,
          response.responseSummary,
        );
      }
    } finally {
      if (sendNobaEmail) {
        this.emailService.sendHardDeclineEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
          sessionID,
          transactionID,
          instrumentID,
          PaymentProviders.CHECKOUT,
          response.responseCode,
          response.responseSummary,
        );
      }
    }

    return response;
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

  async sendWalletVerificationOTP(consumer: Consumer, walletAddress: string) {
    const otp: number = Math.floor(100000 + Math.random() * 900000);
    await this.otpRepo.deleteAllOTPsForUser(consumer.props.email, "CONSUMER");
    await this.otpRepo.saveOTP(consumer.props.email, otp, "CONSUMER");
    await this.emailService.sendWalletUpdateVerificationCode(
      consumer.props.email,
      otp.toString(),
      walletAddress,
      consumer.props.firstName,
    );
  }

  async confirmWalletUpdateOTP(consumer: Consumer, walletAddress: string, otp: number) {
    // Verify if the otp is correct
    const actualOtp = await this.otpRepo.getOTP(consumer.props.email, "CONSUMER");
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp !== otp || currentDateTime > actualOtp.props.otpExpiryTime) {
      // If otp doesn't match or if it is expired then raise unauthorized exception
      throw new UnauthorizedException();
    } else {
      // Just delete the OTP and proceed further
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
    }

    // Find the wallet and mark it verified
    const cryptoWallet: CryptoWallet = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address == walletAddress,
    )[0];
    cryptoWallet.status = WalletStatus.APPROVED;

    return await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
  }

  getCryptoWallet(consumer: Consumer, address: string): CryptoWallet {
    const cryptoWallets = consumer.props.cryptoWallets.filter(wallet => wallet.address === address);

    if (cryptoWallets.length === 0) {
      return null;
    }

    return cryptoWallets[0];
  }

  async addOrUpdateCryptoWallet(consumer: Consumer, cryptoWallet: CryptoWallet): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWallet.address,
    );

    // Send the verification OTP to the user
    if (cryptoWallet.status == WalletStatus.PENDING) {
      await this.sendWalletVerificationOTP(consumer, cryptoWallet.address);
    }

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets, cryptoWallet],
    });
    return updatedConsumer;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletAddress: string): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWalletAddress,
    );

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets],
    });
    return updatedConsumer;
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
