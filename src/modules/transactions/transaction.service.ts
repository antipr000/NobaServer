import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { validate } from "multicoin-address-validator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NobaConfigs, NobaTransactionConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CurrencyService } from "../common/currency.service";
import { CurrencyType } from "../common/domain/Types";
import { ConsumerService } from "../consumer/consumer.service";
import { Consumer } from "../consumer/domain/Consumer";
import { PendingTransactionValidationStatus } from "../consumer/domain/Types";
import { KYCStatus, WalletStatus } from "../consumer/domain/VerificationStatus";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";
import { Partner } from "../partner/domain/Partner";
import { TransConfirmDTO, WebhookType } from "../partner/domain/WebhookTypes";
import { PartnerService } from "../partner/partner.service";
import { TransactionInformation } from "../verification/domain/TransactionInformation";
import { VerificationService } from "../verification/verification.service";
import { AssetService } from "./assets/asset.service";
import { AssetServiceFactory } from "./assets/asset.service.factory";
import { CombinedNobaQuote, NobaQuote, QuoteRequestForFixedFiat } from "./domain/AssetTypes";
import { Transaction } from "./domain/Transaction";
import { TransactionStatus } from "./domain/Types";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TransactionQuoteDTO } from "./dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "./dto/TransactionQuoteQueryDTO";
import {
  TransactionSubmissionException,
  TransactionSubmissionFailureExceptionText,
} from "./exceptions/TransactionSubmissionException";
import { Utils } from "../../core/utils/Utils";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { EllipticService } from "../common/elliptic.service";
import { TransactionFilterOptions } from "./domain/Types";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";

@Injectable()
export class TransactionService {
  private readonly transactionsMapper: TransactionMapper;
  private readonly nobaTransactionConfigs: NobaTransactionConfigs;

  constructor(
    private readonly configService: CustomConfigService,
    private readonly currencyService: CurrencyService,
    private readonly verificationService: VerificationService,
    private readonly consumerService: ConsumerService,
    private readonly assetServiceFactory: AssetServiceFactory,
    private readonly partnerService: PartnerService,
    private readonly ellipticService: EllipticService,
    private readonly sanctionedCryptoWalletService: SanctionedCryptoWalletService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject("TransactionRepo") private readonly transactionsRepo: ITransactionRepo,
    @Inject(NotificationService) private readonly notificationService: NotificationService,
  ) {
    this.transactionsMapper = new TransactionMapper();
    this.nobaTransactionConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction;
  }

  async requestTransactionQuote(transactionQuoteQuery: TransactionQuoteQueryDTO): Promise<TransactionQuoteDTO> {
    // TODO transactionQuoteQuery.partnerID can optionally be used to quote differently per partner.
    // Note that that field is not required and will not be populated for unauthenticated users,
    // so we can't depend on it being there.
    const partner = await this.partnerService.getPartner(transactionQuoteQuery.partnerID);
    if (partner === null || partner === undefined) throw new BadRequestException("Unknown Partner ID");

    if (transactionQuoteQuery.fixedAmount <= 0 || Number.isNaN(transactionQuoteQuery.fixedAmount)) {
      throw new BadRequestException("Invalid amount");
    }

    if (!this.isCryptocurrencyAllowed(partner, transactionQuoteQuery.cryptoCurrencyCode)) {
      throw new BadRequestException(
        `Unsupported crypto currency "${transactionQuoteQuery.cryptoCurrencyCode}". ` +
          `Allowed currencies are "${partner.props.config.cryptocurrencyAllowList}".`,
      );
    }

    const assetService: AssetService = await this.assetServiceFactory.getAssetService(
      transactionQuoteQuery.cryptoCurrencyCode,
    );

    let nobaQuote: NobaQuote;

    switch (transactionQuoteQuery.fixedSide) {
      case CurrencyType.FIAT:
        const quoteRequest: QuoteRequestForFixedFiat = {
          cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
          fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
          fiatAmount: await this.roundToProperDecimalsForFiatCurrency(
            transactionQuoteQuery.fiatCurrencyCode,
            transactionQuoteQuery.fixedAmount,
          ),
          discount: {
            fixedCreditCardFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
            networkFeeDiscountPercent: partner.props.config.fees.networkFeeDiscountPercent,
            nobaFeeDiscountPercent: partner.props.config.fees.nobaFeeDiscountPercent,
            nobaSpreadDiscountPercent: partner.props.config.fees.spreadDiscountPercent,
            processingFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
          },
        };
        if (assetService.needsIntermediaryLeg())
          quoteRequest.intermediateCryptoCurrency = assetService.getIntermediaryLeg();

        nobaQuote = (await assetService.getQuoteForSpecifiedFiatAmount(quoteRequest)).quote;
        break;

      case CurrencyType.CRYPTO:
        nobaQuote = (
          await assetService.getQuoteForSpecifiedCryptoQuantity({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            cryptoQuantity: await this.roundToProperDecimalsForCryptocurrency(
              transactionQuoteQuery.cryptoCurrencyCode,
              transactionQuoteQuery.fixedAmount,
            ),
            discount: {
              fixedCreditCardFeeDiscountPercent: partner.props.config.fees.creditCardFeeDiscountPercent,
              networkFeeDiscountPercent: partner.props.config.fees.networkFeeDiscountPercent,
              nobaFeeDiscountPercent: partner.props.config.fees.nobaFeeDiscountPercent,
              nobaSpreadDiscountPercent: partner.props.config.fees.spreadDiscountPercent,
              processingFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
            },
          })
        ).quote;
        break;

      default:
        throw new BadRequestException("Unsupported fixedSide value");
    }

    // Ensure that in the response we're properly rounding the quote

    return {
      quoteID: nobaQuote.quoteID,
      fiatCurrencyCode: nobaQuote.fiatCurrency,
      cryptoCurrencyCode: nobaQuote.cryptoCurrency,
      fixedSide: transactionQuoteQuery.fixedSide,
      fixedAmount: transactionQuoteQuery.fixedAmount,
      quotedAmount:
        transactionQuoteQuery.fixedSide == CurrencyType.FIAT
          ? await this.roundToProperDecimalsForCryptocurrency(nobaQuote.cryptoCurrency, nobaQuote.totalCryptoQuantity)
          : await this.roundToProperDecimalsForFiatCurrency(nobaQuote.fiatCurrency, nobaQuote.totalFiatAmount),
      processingFee: nobaQuote.processingFeeInFiat,
      networkFee: nobaQuote.networkFeeInFiat,
      nobaFee: nobaQuote.nobaFeeInFiat,
      exchangeRate: nobaQuote.perUnitCryptoPriceWithSpread,
    };
  }

  async getTransaction(transactionID: string): Promise<TransactionDTO> {
    const transaction = await this.transactionsRepo.getTransaction(transactionID);
    return this.transactionsMapper.toDTO(transaction);
  }

  async getUserTransactions(
    userID: string,
    partnerID: string,
    transactionQuery?: TransactionFilterOptions,
  ): Promise<PaginatedResult<TransactionDTO>> {
    const transactionsResult = await this.transactionsRepo.getUserTransactions(userID, partnerID, transactionQuery);
    return { ...transactionsResult, items: transactionsResult.items.map(this.transactionsMapper.toDTO) };
  }

  async getTransactionsInInterval(
    userID: string,
    partnerID: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getUserTransactionInAnInterval(userID, partnerID, fromDate, toDate)).map(
      transaction => this.transactionsMapper.toDTO(transaction),
    );
  }

  //makes sure only app admins should be able to access this method, don't want to expose this method to public users
  async getAllTransactions(): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getAll()).map(transaction => this.transactionsMapper.toDTO(transaction));
  }

  async roundToProperDecimalsForCryptocurrency(cryptocurrency: string, cryptoAmount: number): Promise<number> {
    const currencyDTO = await this.currencyService.getCryptocurrency(cryptocurrency);
    if (currencyDTO == null) {
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.UNKNOWN_CRYPTO);
    }
    return Utils.roundToSpecifiedDecimalNumber(cryptoAmount, currencyDTO.precision);
  }

  async roundToProperDecimalsForFiatCurrency(fiatCurrency: string, fiatAmount: number): Promise<number> {
    const currencyDTO = await this.currencyService.getFiatCurrency(fiatCurrency);
    if (currencyDTO == null) {
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.UNKNOWN_FIAT);
    }

    return Utils.roundToSpecifiedDecimalNumber(fiatAmount, currencyDTO.precision);
  }

  //TODO add proper logs without leaking sensitive information
  //TODO add checks like no more than N transactions per user per day, no more than N transactions per day, etc, no more than N doller transaction per day/month etc.
  async initiateTransaction(
    consumerID: string,
    partnerID: string,
    sessionKey: string,
    transactionRequest: CreateTransactionDTO,
  ): Promise<TransactionDTO> {
    if (partnerID === null || partnerID === undefined)
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.UNKNOWN_PARTNER);

    const partner = await this.partnerService.getPartner(partnerID);
    if (partner === null || partner === undefined) {
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.UNKNOWN_PARTNER);
    }

    // Null or empty crypto allow list means "allow all"
    if (!this.isCryptocurrencyAllowed(partner, transactionRequest.leg2)) {
      this.logger.debug(
        `Unsupported cryptocurrency "${transactionRequest.leg2}". ` +
          `Allowed currencies are "${partner.props.config.cryptocurrencyAllowList}".`,
      );
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.UNKNOWN_CRYPTO);
    }

    // Validate that destination wallet address is a valid address for given currency
    if (!this.isValidDestinationAddress(transactionRequest.leg2, transactionRequest.destinationWalletAddress)) {
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.INVALID_WALLET);
    }

    // Validate & round to proper precision
    const cryptoAmount = await this.roundToProperDecimalsForCryptocurrency(
      transactionRequest.leg2,
      transactionRequest.leg2Amount,
    );

    // Check if the destination wallet is a sanctioned wallet, and if so mark the wallet as FLAGGED
    const isSanctionedWallet = await this.sanctionedCryptoWalletService.isWalletSanctioned(
      transactionRequest.destinationWalletAddress,
    );
    if (isSanctionedWallet) {
      const consumer = await this.consumerService.getConsumer(consumerID);
      const cryptoWallet = this.consumerService.getCryptoWallet(consumer, transactionRequest.destinationWalletAddress);
      cryptoWallet.address = WalletStatus.FLAGGED;
      await this.consumerService.addOrUpdateCryptoWallet(consumer, cryptoWallet);
      this.logger.error("Failed to transact to a sanctioned wallet");
      throw new TransactionSubmissionException(TransactionSubmissionFailureExceptionText.SANCTIONED_WALLET);
    }

    const fiatAmount = await this.roundToProperDecimalsForFiatCurrency(
      transactionRequest.leg1,
      transactionRequest.leg1Amount,
    );

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: consumerID,
      sessionKey: sessionKey,
      paymentMethodID: transactionRequest.paymentToken,
      // We must round the fiat amount to 2 decimals, as that is all Checkout supports
      leg1Amount: fiatAmount,
      leg2Amount: cryptoAmount,
      leg1: transactionRequest.leg1,
      leg2: transactionRequest.leg2,
      fixedSide: transactionRequest.fixedSide,
      transactionStatus: TransactionStatus.PENDING,
      partnerID: partnerID,
      destinationWalletAddress: transactionRequest.destinationWalletAddress,
    });
    const assetService: AssetService = await this.assetServiceFactory.getAssetService(transactionRequest.leg2);

    if (assetService.needsIntermediaryLeg()) {
      if (transactionRequest.fixedSide === CurrencyType.CRYPTO) {
        throw new BadRequestException(`Fixed side crypto is not allowed for ${transactionRequest.leg2}`);
      }

      newTransaction.props.intermediaryLeg = assetService.getIntermediaryLeg();
    }

    // TODO: Refactor this by calling 'requestTransactionQuote' directly.
    let quote: NobaQuote;
    let combinedQuote: CombinedNobaQuote;
    if (transactionRequest.fixedSide === CurrencyType.FIAT) {
      combinedQuote = await assetService.getQuoteForSpecifiedFiatAmount({
        fiatCurrency: transactionRequest.leg1,
        cryptoCurrency: transactionRequest.leg2,
        fiatAmount: await this.roundToProperDecimalsForFiatCurrency(transactionRequest.leg1, fiatAmount),
        intermediateCryptoCurrency: newTransaction.props.intermediaryLeg,
        discount: {
          fixedCreditCardFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
          networkFeeDiscountPercent: partner.props.config.fees.networkFeeDiscountPercent,
          nobaFeeDiscountPercent: partner.props.config.fees.nobaFeeDiscountPercent,
          nobaSpreadDiscountPercent: partner.props.config.fees.spreadDiscountPercent,
          processingFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
        },
      });
      quote = combinedQuote.quote;
    } else {
      combinedQuote = await assetService.getQuoteForSpecifiedCryptoQuantity({
        fiatCurrency: transactionRequest.leg1,
        cryptoCurrency: transactionRequest.leg2,
        cryptoQuantity: await this.roundToProperDecimalsForCryptocurrency(transactionRequest.leg2, cryptoAmount),
        discount: {
          fixedCreditCardFeeDiscountPercent: partner.props.config.fees.creditCardFeeDiscountPercent,
          networkFeeDiscountPercent: partner.props.config.fees.networkFeeDiscountPercent,
          nobaFeeDiscountPercent: partner.props.config.fees.nobaFeeDiscountPercent,
          nobaSpreadDiscountPercent: partner.props.config.fees.spreadDiscountPercent,
          processingFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
        },
      });
      quote = combinedQuote.quote;
    }

    // Perform rounding

    // Check slippage between the original quoted transaction that the user confirmed and the quote we just received above against the non-fixed side
    // quote.quotedAmount will always be the in the currency opposite of the fixed side
    const withinSlippage =
      transactionRequest.fixedSide == CurrencyType.FIAT
        ? this.withinSlippage(cryptoAmount, quote.totalCryptoQuantity)
        : this.withinSlippage(fiatAmount, quote.totalFiatAmount);
    if (!withinSlippage) {
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.SLIPPAGE,
        "",
        `Bid price is not within slippage allowed of ${this.nobaTransactionConfigs.slippageAllowedPercentage * 100}%`,
      );
    }

    // TODO(#): Remove all these settings here and move it to AssetService 'executeQuoteForFundsAvailability'
    // Add quote information to new transaction
    newTransaction.props.tradeQuoteID = quote.quoteID;
    newTransaction.props.nobaFee = quote.nobaFeeInFiat;
    newTransaction.props.networkFee = quote.networkFeeInFiat;
    newTransaction.props.processingFee = quote.processingFeeInFiat;
    newTransaction.props.exchangeRate = quote.perUnitCryptoPriceWithSpread;
    newTransaction.props.buyRate = quote.perUnitCryptoPriceWithoutSpread;
    newTransaction.props.amountPreSpread = quote.amountPreSpread;

    // Set the amount that wasn't fixed based on the quote received
    if (transactionRequest.fixedSide == CurrencyType.FIAT) {
      newTransaction.props.leg2Amount = await this.roundToProperDecimalsForCryptocurrency(
        transactionRequest.leg2,
        quote.totalCryptoQuantity,
      );

      if (quote.totalIntermediateCryptoAmount) {
        newTransaction.props.intermediaryLegAmount = await this.roundToProperDecimalsForCryptocurrency(
          newTransaction.props.intermediaryLeg,
          quote.totalIntermediateCryptoAmount,
        );
      }
    } else {
      newTransaction.props.leg1Amount = await this.roundToProperDecimalsForFiatCurrency(
        transactionRequest.leg1,
        quote.totalFiatAmount,
      );
    }

    this.logger.debug(`Transaction: ${JSON.stringify(newTransaction.props)}`);

    // TODO: Create a new record with all the undiscounted fee amounts (or just the difference?)

    // Save transaction to the database
    this.transactionsRepo.createTransaction(newTransaction);

    return this.transactionsMapper.toDTO(newTransaction); // Enable the new transaction flow without deleting the remaining code just yet
  }

  public async validatePendingTransaction(
    consumer: Consumer,
    transaction: Transaction,
  ): Promise<PendingTransactionValidationStatus> {
    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);

    if (!paymentMethod) {
      this.logger.error(
        `Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}, Transaction ID: ${transaction.props._id}`,
      );
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.UNKNOWN_PAYMENT_METHOD,
        "UnknownPaymentMethod",
        "Payment method does not exist for user",
      );
    }

    const cryptoWallet = this.consumerService.getCryptoWallet(consumer, transaction.props.destinationWalletAddress);
    if (cryptoWallet == null) {
      this.logger.error(
        `Attempt to initiate transaction with unknown wallet. Transaction ID: ${transaction.props._id}`,
      );
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.WALLET_DOES_NOT_EXIST,
        "WalletNotFound",
        "Requested wallet address does not exist for user",
      );
    }

    const partner = await this.partnerService.getPartner(transaction.props.partnerID);
    if (partner == null) {
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.UNKNOWN_PARTNER,
        "Unknown partner",
        `Unable to find record for partner ID ${transaction.props.partnerID}`,
      );
    }

    // Check Sardine for AML
    const sardineTransactionInformation: TransactionInformation = {
      transactionID: transaction.props._id,
      amount: transaction.props.leg1Amount,
      currencyCode: transaction.props.leg1,
      first6DigitsOfCard: paymentMethod.first6Digits,
      last4DigitsOfCard: paymentMethod.last4Digits,
      cardID: paymentMethod.paymentToken,
      cryptoCurrencyCode: transaction.props.leg2,
      walletAddress: transaction.props.destinationWalletAddress,
      walletStatus: cryptoWallet.status,
      partnerName: partner.props.name,
    };
    const result = await this.verificationService.transactionVerification(
      transaction.props.sessionKey,
      consumer,
      sardineTransactionInformation,
    );

    if (result.walletStatus) {
      cryptoWallet.status = result.walletStatus;
      await this.consumerService.addOrUpdateCryptoWallet(consumer, cryptoWallet);
    }

    if (result.paymentMethodStatus) {
      consumer = await this.consumerService.updatePaymentMethod(consumer.props._id, {
        ...paymentMethod,
        status: result.paymentMethodStatus,
      });
    }

    if (result.status !== KYCStatus.APPROVED) {
      this.logger.debug(
        `Failed to make transaction. Reason: KYC Provider has tagged the transaction as high risk. ${JSON.stringify(
          result,
        )}`,
      );
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.SANCTIONED_TRANSACTION,
        "HighRiskTransaction",
        "Transaction has been detected to be high risk",
      );
    }

    if (result.walletStatus !== WalletStatus.APPROVED) {
      this.logger.debug(`Failed to make transaction. Reason: Wallet is not approved, ${JSON.stringify(result)}`);
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.SANCTIONED_WALLET,
        "WalletNotApproved",
        "Wallet status is not approved yet",
      );
    }

    try {
      // This is where transaction is accepted by us. Send email here. However this should not break the flow so addded
      // try catch block
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT,
        transaction.props.partnerID,
        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          email: consumer.props.displayEmail,
          transactionInitiatedParams: {
            transactionID: transaction.props._id,
            transactionTimestamp: transaction.props.transactionTimestamp,
            paymentMethod: paymentMethod.cardType,
            last4Digits: paymentMethod.last4Digits,
            currencyCode: transaction.props.leg1,
            conversionRate: transaction.props.exchangeRate,
            processingFee: transaction.props.processingFee,
            networkFee: transaction.props.networkFee,
            nobaFee: transaction.props.nobaFee,
            totalPrice: transaction.props.leg1Amount,
            cryptoAmount: transaction.props.leg2Amount,
            cryptoCurrency: transaction.props.leg2,
          },
        },
      );
    } catch (e) {
      this.logger.error("Failed to send email at transaction initiation. " + e);
    }

    return PendingTransactionValidationStatus.PASS;
  }

  /**
   * Slippage is calculated as the absolute value of quoted price (that the user confirmed) - current price (quote just received). If this is < slippageAllowed * quoted price, we're good.
   */
  withinSlippage(quotedPrice: number, currentPrice: number): boolean {
    const withinSlippage =
      Math.abs(quotedPrice - currentPrice) <= this.nobaTransactionConfigs.slippageAllowedPercentage * quotedPrice;

    this.logger.debug(
      `Within slippage? Quote: ${quotedPrice}-${currentPrice}=${Math.abs(quotedPrice - currentPrice)} <= ${
        this.nobaTransactionConfigs.slippageAllowedPercentage * quotedPrice
      }? ${withinSlippage}`,
    );

    return withinSlippage;
  }

  async analyzeTransactionWalletExposure(transaction: Transaction): Promise<void> {
    const walletExposureResponse = await this.ellipticService.transactionAnalysis(transaction);

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const cryptoWallet = this.consumerService.getCryptoWallet(consumer, transaction.props.destinationWalletAddress);

    cryptoWallet.riskScore = walletExposureResponse.riskScore;

    if (walletExposureResponse.riskScore !== null && walletExposureResponse.riskScore > 0) {
      this.logger.debug(
        `Wallet ${transaction.props.destinationWalletAddress} for consumer ${consumer.props._id} has been flagged with risk score: ${walletExposureResponse.riskScore}`,
      );
      cryptoWallet.status = WalletStatus.FLAGGED;
    }

    await this.consumerService.addOrUpdateCryptoWallet(consumer, cryptoWallet);
  }

  private isValidDestinationAddress(curr: string, destinationWalletAddress: string): boolean {
    // Throws an exception saying "Missing validator for currency {currency}" if it doesn't know of the currency.
    // We should catch this in the caller and ultimately display a warning to the user that the address could not be validated.

    // Strip anything from the first period onward
    const checkCurr = curr.split(".")[0];
    return validate(destinationWalletAddress, checkCurr);
  }

  private getAxiosConfig(partner: Partner): AxiosRequestConfig {
    return {
      auth: {
        username: partner.props.webhookClientID,
        password: partner.props.webhookSecret,
      },
    };
  }

  async callTransactionConfirmWebhook(consumer: Consumer, transaction: Transaction) {
    const partnerID = transaction.props.partnerID;
    if (!partnerID) {
      return;
    }

    const partner = await this.partnerService.getPartner(partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.TRANSACTION_CONFIRM);
    if (webhook == null) {
      return; // Partner doesn't have a webhook callback
    }

    const payload: TransConfirmDTO = {
      consumer: new ConsumerMapper().toSimpleDTO(consumer),
      transaction: new TransactionMapper().toDTO(transaction),
    };

    try {
      const config = this.getAxiosConfig(partner);
      await axios.post(webhook.url, payload, config);
    } catch (err) {
      this.logger.error(
        `Error calling ${webhook.type} at url ${webhook.url} for partner ${partner.props.name} transaction ID: ${transaction.props._id}. Error: ${err.message}`,
      );
    }
  }

  private isCryptocurrencyAllowed(partner: Partner, cryptocurrency: string) {
    return (
      partner.props.config.cryptocurrencyAllowList === null ||
      partner.props.config.cryptocurrencyAllowList === undefined ||
      partner.props.config.cryptocurrencyAllowList.length == 0 ||
      partner.props.config.cryptocurrencyAllowList.includes(cryptocurrency)
    );
  }
}
