import { Injectable, BadRequestException, Inject, InternalServerErrorException } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CheckoutConfigs } from "../../config/configtypes/CheckoutConfigs";
import { CHECKOUT_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Consumer, ConsumerProps } from "../consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../consumer/domain/PaymentMethod";
import { AddPaymentMethodDTO, PaymentType } from "../consumer/dto/AddPaymentMethodDTO";
import { PaymentMethodStatus } from "../consumer/domain/VerificationStatus";
import {
  REASON_CODE_SOFT_DECLINE_BANK_ERROR,
  REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA,
  REASON_CODE_SOFT_DECLINE_CARD_ERROR,
  REASON_CODE_SOFT_DECLINE_NO_CRYPTO,
} from "../transactions/domain/CheckoutConstants";
import { CardFailureExceptionText, CardProcessingException } from "../consumer/CardProcessingException";
import { BINValidity } from "../common/dto/CreditCardDTO";
import { CreditCardService } from "../common/creditcard.service";
import { CheckoutResponseData } from "../common/domain/CheckoutResponseData";
import { AddCreditCardPaymentMethodResponse, AddInstrumentRequest } from "../common/domain/AddPaymentMethodResponse";
import { Transaction } from "../transactions/domain/Transaction";
import { PaymentRequestResponse, CheckoutPaymentStatus, FiatTransactionStatus } from "../consumer/domain/Types";
import { Utils } from "../../core/utils/Utils";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { PaymentProvider } from "../consumer/domain/PaymentProvider";

@Injectable()
export class CheckoutService {
  private readonly checkoutApi: Checkout;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly creditCardService: CreditCardService;

  constructor(private configService: CustomConfigService) {
    const checkoutSecretKey = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).secretKey;
    const checkoutPublicKey = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).publicKey;
    this.checkoutApi = new Checkout(checkoutSecretKey, {
      pk: checkoutPublicKey,
    });
  }

  public async createCheckoutCustomer(consumer: Consumer): Promise<string> {
    // TODO: Move this to the service layer as this is business logic.
    const checkoutCustomerData = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProvider.CHECKOUT,
    );

    if (checkoutCustomerData.length !== 0) return checkoutCustomerData[0].providerCustomerID;

    // New customer. Create customer id
    try {
      const checkoutCustomer = await this.checkoutApi.customers.create({
        email: consumer.props.email,
        metadata: {
          coupon_code: this.configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).couponCode,
          partner_id: this.configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).partnerId,
        },
      });

      return checkoutCustomer["id"];
    } catch (e) {
      if (e.body["error_codes"].filter(errorCode => errorCode === "customer_email_already_exists").length > 0) {
        // existing customer
        const checkoutCustomer = await this.checkoutApi.customers.get(consumer.props.email);
        return checkoutCustomer["id"];
      } else {
        throw new BadRequestException("Failed to create checkout customer");
      }
    }
  }

  public async addInstrument(request: AddInstrumentRequest): Promise<string> {
    const instrument = await this.checkoutApi.instruments.create({
      token: request.checkoutToken,
      customer: {
        id: request.checkoutCustomerID,
      },
    });

    return instrument["id"];
  }

  public async addCreditCardPaymentMethod(
    consumer: Consumer,
    paymentMethod: AddPaymentMethodDTO,
    partnerId: string,
  ): Promise<AddCreditCardPaymentMethodResponse> {
    if (paymentMethod.type !== PaymentType.CARD) {
      this.logger.error(
        `"addCreditCardPaymentMethod" was called for payment method type "${paymentMethod.type}" which is unexpected.`,
      );
      throw new InternalServerErrorException("Internal server error. Please try again.");
    }

    const checkoutCustomerID: string = await this.createCheckoutCustomer(consumer);
    const checkoutCustomerData = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProvider.CHECKOUT,
    );
    const hasCustomerIDSaved = checkoutCustomerData.length > 0;

    let instrumentID: string;
    let cardType: string;
    let checkoutResponse;
    try {
      // To add payment method, we first need to tokenize the card
      // Token is only valid for 15 mins
      const token = await this.checkoutApi.tokens.request({
        type: "card",
        number: paymentMethod.cardDetails.cardNumber,
        expiry_month: paymentMethod.cardDetails.expiryMonth,
        expiry_year: paymentMethod.cardDetails.expiryYear,
        cvv: paymentMethod.cardDetails.cvv,
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

    // Before calling checkout, check against our BIN list
    const validity = await this.creditCardService.isBINSupported(paymentMethod.cardDetails.cardNumber);
    if (validity == BINValidity.NOT_SUPPORTED) {
      // Bypass checkout call entirely
      throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
    }

    try {
      // Check if added payment method is valid
      checkoutResponse = await this.checkoutApi.payments.request({
        amount: 1, // 1 cent (amount field is denominated in cents not a decimal dollar)
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
        paymentMethod.cardDetails.cardNumber,
        "verification",
        "verification",
        partnerId,
      );
    } catch (e) {
      if (e instanceof CardProcessingException) {
        throw new BadRequestException(e.disposition);
      } else {
        throw new BadRequestException("Unable to add card at this time");
      }
    }

    if (response.paymentMethodStatus === PaymentMethodStatus.REJECTED) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT,
        partnerId,
        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props._id,
          email: consumer.props.displayEmail,
          last4Digits: paymentMethod.cardDetails.cardNumber.substring(paymentMethod.cardDetails.cardNumber.length - 4),
        },
      );
      throw new BadRequestException(CardFailureExceptionText.DECLINE);
    } else if (response.paymentMethodStatus === PaymentMethodStatus.FLAGGED) {
      // TODO - we don't currently have a use case for FLAGGED
    } else {
      const newPaymentMethod: PaymentMethod = {
        name: paymentMethod.name,
        type: PaymentMethodType.CARD,
        cardData: {
          cardType: cardType,
          first6Digits: paymentMethod.cardDetails.cardNumber.substring(0, 6),
          last4Digits: paymentMethod.cardDetails.cardNumber.substring(paymentMethod.cardDetails.cardNumber.length - 4),
          authCode: response.responseCode,
          authReason: response.responseSummary,
        },
        imageUri: paymentMethod.imageUri,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: instrumentID,
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
              providerID: PaymentProvider.CHECKOUT,
              providerCustomerID: checkoutCustomerID,
            },
          ],
        };
      }
      return {
        checkoutResponseData: response,
        updatedConsumerData: updatedConsumerProps,
        newPaymentMethod: newPaymentMethod,
      };
    }
    return {
      checkoutResponseData: response,
    };
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
      transaction.props.transactionID,
      transaction.props.partnerID,
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

  async getFiatPaymentStatus(paymentId: string): Promise<FiatTransactionStatus> {
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

  async removePaymentMethod(paymentToken: string): Promise<void> {
    await this.checkoutApi.instruments.delete(paymentToken);
  }

  private async handleCheckoutResponse(
    consumer: Consumer,
    checkoutResponse: string,
    instrumentID: string,
    cardNumber: string,
    sessionID: string,
    transactionID: string,
    partnerID: string,
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
        } else if (REASON_CODE_SOFT_DECLINE_NO_CRYPTO.indexOf(response.responseCode) > -1) {
          // TODO(#593): Update BIN list here
          throw new CardProcessingException(
            CardFailureExceptionText.NO_CRYPTO,
            response.responseCode,
            response.responseSummary,
          );
        } else if (REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA.indexOf(response.responseCode) > -1) {
          sendNobaEmail = true;
          throw new CardProcessingException(
            CardFailureExceptionText.SOFT_DECLINE,
            response.responseCode,
            response.responseSummary,
          );
        } else {
          this.logger.error(`Unknown checkout response: ${response.responseCode} - ${response.responseSummary}`);
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
        await this.notificationService.sendNotification(NotificationEventType.SEND_HARD_DECLINE_EVENT, partnerID, {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props._id,
          email: consumer.props.displayEmail,
          sessionID: sessionID,
          transactionID: transactionID,
          paymentToken: instrumentID,
          processor: PaymentProvider.CHECKOUT,
          responseCode: response.responseCode,
          responseSummary: response.responseCode,
        });
      }
    }

    return response;
  }
}
