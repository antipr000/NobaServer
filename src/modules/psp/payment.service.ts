import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { FiatTransactionStatus } from "../consumer/domain/Types";
import { CheckoutClient } from "./checkout.client";
import { BankFactory } from "./factory/bank.factory";
import { BankName } from "./domain/BankFactoryTypes";
import { BalanceDTO } from "./dto/balance.dto";
import { IBalanceProvider } from "./factory/ibalanceprovider";

@Injectable()
export class PaymentService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly checkoutClient: CheckoutClient;

  @Inject()
  private readonly bankFactory: BankFactory;

  /* TODO: Incompatible with new Noba product. Will need to be rewritten if we bring back the onramp functionality.
  public async requestCheckoutPayment(
    consumer: Consumer,
    transaction: Transaction,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentRequestResponse> {
    switch (paymentMethod.props.type) {
      case PaymentMethodType.CARD:
        return this.makeCardPayment(consumer, transaction);
      case PaymentMethodType.ACH:
        return this.makeACHPayment(consumer, transaction);
    }
  }

  
  private async makeCardPayment(consumer: Consumer, transaction: Transaction): Promise<PaymentRequestResponse> {
    const paymentResponse: PspCardPaymentResponse = await this.checkoutClient.makeCardPayment(
      Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
      transaction.props.leg1,
      transaction.props.fiatPaymentInfo.paymentMethodID,
      transaction.props._id,
      consumer,
      transaction.props._id, // Idempotency key to ensure a duplicate submission does not result in duplicate charge
    );

    let creditCardBinData = await this.creditCardService.getBINDetails(paymentResponse.bin);

    if (creditCardBinData === null) {
      // Record is not in our db. Fetch payment method details from checkout and add entry
      const paymentMethodResponse = await this.checkoutClient.getPaymentMethod(
        transaction.props.fiatPaymentInfo.paymentMethodID,
      );
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
      instrumentID: transaction.props.fiatPaymentInfo.paymentMethodID,
      cardNumber: null,
      sessionID: transaction.props.sessionKey,
      transactionID: transaction.props.transactionID,
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
    const response: PspACHPaymentResponse = await this.checkoutClient.makeACHPayment(
      Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
      transaction.props.leg1,
      transaction.props.fiatPaymentInfo.paymentMethodID,
      transaction.props._id,
      consumer,
      transaction.props._id,
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
  }*/

  async getBalance(bankName: BankName, accountID: string): Promise<BalanceDTO> {
    const balanceProvider: IBalanceProvider = this.bankFactory.getBankImplementation(bankName);

    const balance = await balanceProvider.getBalance(accountID);
    return balance;
  }

  async getFiatPaymentStatus(paymentId: string): Promise<FiatTransactionStatus> {
    const status = await this.checkoutClient.getPaymentDetails(paymentId);
    console.log(status);
    if (status === "Authorized" || status === "Paid") return FiatTransactionStatus.AUTHORIZED;
    if (status === "Captured" || status === "Partially Captured") return FiatTransactionStatus.CAPTURED;
    if (status === "Pending") return FiatTransactionStatus.PENDING;

    this.logger.error(`Payment ${paymentId} failed fiat processing with status ${status}`);
    return FiatTransactionStatus.FAILED;
  }

  async removePaymentMethod(paymentToken: string): Promise<void> {
    await this.checkoutClient.removePaymentMethod(paymentToken);
  }
}
