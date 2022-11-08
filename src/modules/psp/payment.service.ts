import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
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
import { BINValidity, CardType, CreditCardDTO } from "../common/dto/CreditCardDTO";
import { CreditCardService } from "../common/creditcard.service";
import { CheckoutResponseData } from "../common/domain/CheckoutResponseData";
import { AddPaymentMethodResponse } from "./domain/AddPaymentMethodResponse";
import { Transaction } from "../transactions/domain/Transaction";
import { PaymentRequestResponse, FiatTransactionStatus } from "../consumer/domain/Types";
import { Utils } from "../../core/utils/Utils";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { PaymentProvider } from "../consumer/domain/PaymentProvider";
import { CreditCardBinData } from "../common/domain/CreditCardBinData";
import creditCardType from "credit-card-type";
import { CheckoutClient } from "./checkout.client";
import { PspAddPaymentMethodResponse } from "./domain/PspAddPaymentMethodResponse";
import { HandlePaymentResponse } from "./domain/CardServiceTypes";
import { PspACHPaymentResponse, PspCardPaymentResponse } from "./domain/PspPaymentResponse";
import { PlaidClient } from "./plaid.client";
import { RetrieveAccountDataResponse, TokenProcessor } from "./domain/PlaidTypes";

@Injectable()
export class PaymentService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly creditCardService: CreditCardService;

  @Inject()
  private readonly checkoutService: CheckoutClient;

  @Inject()
  private readonly plaidClient: PlaidClient;

  /**
   * Checks if consumer already has account with PSP. If not creates the account
   * @param consumer Details of the consumer
   * @returns [string, boolean]: Array of 2 values. The first element represents the customer id of the account created in PSP
   * The second value represents whether account was already created or a new account has been created. Returns true if account
   * existed else false
   */
  public async createPspConsumerAccount(consumer: Consumer): Promise<[string, boolean]> {
    const checkoutCustomerData = consumer.props.paymentProviderAccounts.filter(
      paymentProviderAccount => paymentProviderAccount.providerID === PaymentProvider.CHECKOUT,
    );

    if (checkoutCustomerData.length === 0) {
      // new customer. Create customer id
      return [await this.checkoutService.createConsumer(consumer.props.email), false];
    } else {
      return [checkoutCustomerData[0].providerCustomerID, true];
    }
  }

  public async addPaymentMethod(
    consumer: Consumer,
    paymentMethod: AddPaymentMethodDTO,
    partnerId: string,
  ): Promise<AddPaymentMethodResponse> {
    switch (paymentMethod.type) {
      case PaymentType.CARD:
        return this.addCreditCardPaymentMethod(consumer, paymentMethod, partnerId);
      case PaymentType.ACH:
        return this.addACHPaymentMethod(consumer, paymentMethod);
    }
  }

  private async addCreditCardPaymentMethod(
    consumer: Consumer,
    paymentMethod: AddPaymentMethodDTO,
    partnerId: string,
  ): Promise<AddPaymentMethodResponse> {
    let creditCardBinData: CreditCardDTO;

    const [checkoutCustomerID, hasCustomerIDSaved] = await this.createPspConsumerAccount(consumer);

    const addPaymentMethodResponse: PspAddPaymentMethodResponse = await this.checkoutService.addCreditCardPaymentMethod(
      paymentMethod,
      checkoutCustomerID,
    );

    // Check if this card already exists for the consumer
    const existingPaymentMethod = consumer.getPaymentMethodByID(addPaymentMethodResponse.instrumentID);
    if (existingPaymentMethod) {
      throw new BadRequestException("Card already added");
    }

    // Before calling checkout, check against our BIN list
    const validity = await this.creditCardService.isBINSupported(addPaymentMethodResponse.bin);

    let paymentResponse: PspCardPaymentResponse;

    if (validity == BINValidity.NOT_SUPPORTED) {
      // Bypass checkout call entirely
      throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
    } else if (validity === BINValidity.SUPPORTED) {
      paymentResponse = {
        id: null,
        response_code: "10000",
        response_summary: "Approved",
        risk: {
          flagged: false,
        },
        bin: addPaymentMethodResponse.bin,
      };
      creditCardBinData = await this.creditCardService.getBINDetails(addPaymentMethodResponse.bin);
    } else {
      // Record not in our BIN list. We will make the $1 charge
      try {
        // Check if added payment method is valid
        paymentResponse = await this.checkoutService.makeCardPayment(
          /* amount= */ 1,
          /* currency= */ "USD",
          /* paymentMethodId= */ addPaymentMethodResponse.instrumentID,
          /* transactionId= */ "test_order_1",
        );

        creditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
          issuer: addPaymentMethodResponse.issuer.toLocaleLowerCase().split(" ").join("_"),
          bin: addPaymentMethodResponse.bin,
          type: addPaymentMethodResponse.cardType.toLocaleLowerCase() === "credit" ? CardType.CREDIT : CardType.DEBIT,
          network: addPaymentMethodResponse.scheme,
          supported: BINValidity.UNKNOWN,
          digits: paymentMethod.cardDetails.cardNumber.length,
          cvvDigits: paymentMethod.cardDetails.cvv.length,
        }).props;
      } catch (err) {
        this.logger.error(`Error validating card instrument ${addPaymentMethodResponse.instrumentID}: ${err}`);
        throw new BadRequestException("Card validation error");
      }
    }

    let response: CheckoutResponseData;
    try {
      response = await this.handlePaymentResponse({
        consumer: consumer,
        paymentResponse: paymentResponse,
        instrumentID: addPaymentMethodResponse.instrumentID,
        cardNumber: paymentMethod.cardDetails.cardNumber,
        sessionID: "verification",
        transactionID: "verification",
        partnerID: partnerId,
        binData: creditCardBinData,
      });
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
          cardType: addPaymentMethodResponse.cardType,
          first6Digits: paymentMethod.cardDetails.cardNumber.substring(0, 6),
          last4Digits: paymentMethod.cardDetails.cardNumber.substring(paymentMethod.cardDetails.cardNumber.length - 4),
          authCode: response.responseCode,
          authReason: response.responseSummary,
        },
        imageUri: paymentMethod.imageUri,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: addPaymentMethodResponse.instrumentID,
      };

      if (response.paymentMethodStatus) {
        newPaymentMethod.status = response.paymentMethodStatus;
      }

      return this.prepareAddPaymentMethodResponse(
        consumer,
        newPaymentMethod,
        hasCustomerIDSaved,
        checkoutCustomerID,
        response,
      );
    }
  }

  private async addACHPaymentMethod(
    consumer: Consumer,
    paymentMethod: AddPaymentMethodDTO,
  ): Promise<AddPaymentMethodResponse> {
    const accessToken: string = await this.plaidClient.exchangeForAccessToken({
      publicToken: paymentMethod.achDetails.token,
    });
    const accountData: RetrieveAccountDataResponse = await this.plaidClient.retrieveAccountData({
      accessToken: accessToken,
    });
    const processorToken: string = await this.plaidClient.createProcessorToken({
      accessToken: accessToken,
      accountID: accountData.accountID,
      tokenProcessor: TokenProcessor.CHECKOUT,
    });

    // Create or get Customer ID - even though we don't need it here, this ensures we have one
    // that we can use by the time we make a payment
    const [checkoutCustomerID, hasCustomerIDSaved] = await this.createPspConsumerAccount(consumer);

    // const checkoutResponse = await this.checkoutService.performOneDollarACHTransaction(processorToken);
    // console.log(checkoutResponse);
    const newPaymentMethod: PaymentMethod = {
      name: accountData.name,
      type: PaymentMethodType.ACH,
      achData: {
        // TODO(Plaid): Encrypt it.
        accessToken: accessToken,
        accountID: accountData.accountID,
        itemID: accountData.itemID,
        mask: accountData.mask,
        accountType: accountData.accountType,
      },
      imageUri: paymentMethod.imageUri,
      paymentProviderID: PaymentProvider.CHECKOUT,
      paymentToken: processorToken,
      status: PaymentMethodStatus.APPROVED,
    };

    return this.prepareAddPaymentMethodResponse(
      consumer,
      newPaymentMethod,
      hasCustomerIDSaved,
      checkoutCustomerID,
      null,
    );
  }

  public async requestCheckoutPayment(
    consumer: Consumer,
    transaction: Transaction,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentRequestResponse> {
    switch (paymentMethod.type) {
      case PaymentMethodType.CARD:
        return this.makeCardPayment(consumer, transaction);
      case PaymentMethodType.ACH:
        return this.makeACHPayment(consumer, transaction);
    }
  }

  private async makeCardPayment(consumer: Consumer, transaction: Transaction): Promise<PaymentRequestResponse> {
    const paymentResponse: PspCardPaymentResponse = await this.checkoutService.makeCardPayment(
      /* amount= */ Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
      /* currency= */ transaction.props.leg1,
      /* paymentMethodId= */ transaction.props.paymentMethodID,
      /* transactionId= */ transaction.props._id,
    );

    let creditCardBinData = await this.creditCardService.getBINDetails(paymentResponse.bin);

    if (creditCardBinData === null) {
      // Record is not in our db. Fetch payment method details from checkout and add entry
      const paymentMethodResponse = await this.checkoutService.getPaymentMethod(transaction.props.paymentMethodID);
      let cardType = paymentMethodResponse.cardType;
      const bin = paymentMethodResponse.bin;
      const scheme = paymentMethodResponse.scheme;
      const issuer = paymentMethodResponse.issuer; // We will not always have an issuer in the instrument response

      const possibleCards = creditCardType(bin);

      if (possibleCards.length > 1) {
        console.log("More than one possible card type for given bin: " + JSON.stringify(possibleCards));
      }

      const card = possibleCards[0];

      if (cardType) {
        cardType = cardType.toLocaleLowerCase() === "credit" ? CardType.CREDIT : CardType.DEBIT;
      }

      creditCardBinData = {
        issuer: issuer,
        bin: bin,
        type: cardType as CardType,
        network: scheme,
        supported: BINValidity.SUPPORTED,
        digits: card.lengths[0],
        cvvDigits: card.code[Utils.getCodeTypeFromCardScheme(card.type)],
      };

      this.logger.info(`Adding BIN data: ${JSON.stringify(creditCardBinData, null, 1)}`);
      creditCardBinData = await this.creditCardService.addBinData(creditCardBinData);
    }

    const response = await this.handlePaymentResponse({
      consumer: consumer,
      paymentResponse: paymentResponse,
      instrumentID: transaction.props.paymentMethodID,
      cardNumber: null,
      sessionID: transaction.props.sessionKey,
      transactionID: transaction.props.transactionID,
      partnerID: transaction.props.partnerID,
      binData: creditCardBinData,
    });

    switch (response.paymentMethodStatus) {
      case PaymentMethodStatus.APPROVED:
        return { status: response.paymentMethodStatus, paymentID: paymentResponse.id };
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

  private async makeACHPayment(consumer: Consumer, transaction: Transaction): Promise<PaymentRequestResponse> {
    const response: PspACHPaymentResponse = await this.checkoutService.makeACHPayment(
      /* amount= */ Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
      /* currency= */ transaction.props.leg1,
      /* paymentMethodId= */ transaction.props.paymentMethodID,
      /* transactionId= */ transaction.props._id,
    );

    if (response.status !== "Pending") {
      return {
        paymentID: response.id,
        status: PaymentMethodStatus.REJECTED,
        responseCode: response.response_code,
      };
    }

    return {
      paymentID: response.id,
      status: PaymentMethodStatus.APPROVED,
      responseCode: response.response_code,
    };
  }

  async getFiatPaymentStatus(paymentId: string): Promise<FiatTransactionStatus> {
    const status = await this.checkoutService.getPaymentDetails(paymentId);
    if (status === "Authorized" || status === "Paid") return FiatTransactionStatus.AUTHORIZED;
    if (status === "Captured" || status === "Partially Captured") return FiatTransactionStatus.CAPTURED;
    if (status === "Pending") return FiatTransactionStatus.PENDING;

    this.logger.error(`Payment ${paymentId} failed fiat processing with status ${status}`);
    return FiatTransactionStatus.FAILED;
  }

  async removePaymentMethod(paymentToken: string): Promise<void> {
    await this.checkoutService.removePaymentMethod(paymentToken);
  }

  private async prepareAddPaymentMethodResponse(
    consumer: Consumer,
    newPaymentMethod: PaymentMethod,
    hasCustomerIDSaved: boolean,
    checkoutCustomerID: string,
    checkoutResponse: CheckoutResponseData,
  ): Promise<AddPaymentMethodResponse> {
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
      checkoutResponseData: checkoutResponse,
      updatedConsumerData: updatedConsumerProps,
      newPaymentMethod: newPaymentMethod,
    };
  }

  private async handlePaymentResponse({
    consumer,
    paymentResponse,
    instrumentID,
    cardNumber,
    sessionID,
    transactionID,
    partnerID,
    binData,
  }: HandlePaymentResponse): Promise<CheckoutResponseData> {
    const response: CheckoutResponseData = new CheckoutResponseData();
    response.responseCode = paymentResponse.response_code;
    response.responseSummary = paymentResponse.response_summary;
    let sendNobaEmail = false;

    try {
      let creditCardBinData = await this.creditCardService.getBINDetails(binData.bin);
      if (!creditCardBinData) creditCardBinData = binData;

      if (!response.responseCode) {
        this.logger.error(`No response code received validating card instrument ${instrumentID}`);
        throw new CardProcessingException(CardFailureExceptionText.ERROR);
      } else if (response.responseCode.startsWith("10")) {
        // If reqeust payment was successful
        response.paymentMethodStatus = PaymentMethodStatus.APPROVED;
        if (cardNumber) {
          creditCardBinData.supported = BINValidity.SUPPORTED;
          await this.creditCardService.addOrUpdateBinData(creditCardBinData);
        }
      } else if (response.responseCode.startsWith("20")) {
        // Soft decline, with several categories
        if (
          [...REASON_CODE_SOFT_DECLINE_CARD_ERROR, ...REASON_CODE_SOFT_DECLINE_BANK_ERROR].indexOf(
            response.responseCode,
          ) > -1
        ) {
          // Card error, possibly bad number, user should confirm details
          throw new CardProcessingException(
            CardFailureExceptionText.SOFT_DECLINE,
            response.responseCode,
            response.responseSummary,
          );
        } else if (REASON_CODE_SOFT_DECLINE_NO_CRYPTO.indexOf(response.responseCode) > -1) {
          creditCardBinData.supported = BINValidity.NOT_SUPPORTED;
          await this.creditCardService.addOrUpdateBinData(creditCardBinData);
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
      } else if (response.responseCode.startsWith("40") || paymentResponse.risk.flagged) {
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
