import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { validate } from "multicoin-address-validator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CurrencyService } from "../common/currency.service";
import { CurrencyType } from "../common/domain/Types";
import { ConsumerService } from "../consumer/consumer.service";
import { KYCStatus } from "../consumer/domain/VerificationStatus";
import { TransactionInformation } from "../verification/domain/TransactionInformation";
import { VerificationService } from "../verification/verification.service";
import { Transaction } from "./domain/Transaction";
import { TransactionStatus } from "./domain/Types";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TransactionQuoteDTO } from "./dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "./dto/TransactionQuoteQueryDTO";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { ZeroHashService } from "./zerohash.service";
import { EmailService } from "../common/email.service";
import { NobaTransactionConfigs, NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { Consumer } from "../consumer/domain/Consumer";
import { PendingTransactionValidationStatus } from "../consumer/domain/Types";
import { AssetServiceFactory } from "./assets/asset.service.factory";
import { AssetService } from "./assets/asset.service";
import { PartnerService } from "../partner/partner.service";
import { NobaQuote } from "./domain/AssetTypes";
import axios, { AxiosRequestConfig } from "axios";
import { Partner } from "../partner/domain/Partner";
import { TransConfirmDTO, WebhookType } from "../partner/domain/WebhookTypes";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";

@Injectable()
export class TransactionService {
  private readonly transactionsMapper: TransactionMapper;
  private readonly nobaTransactionConfigs: NobaTransactionConfigs;

  constructor(
    private readonly configService: CustomConfigService,
    private readonly currencyService: CurrencyService,
    private readonly zeroHashService: ZeroHashService,
    private readonly verificationService: VerificationService,
    private readonly consumerService: ConsumerService,
    private readonly assetServiceFactory: AssetServiceFactory,
    private readonly partnerService: PartnerService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject("TransactionRepo") private readonly transactionsRepo: ITransactionRepo,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {
    this.transactionsMapper = new TransactionMapper();
    this.nobaTransactionConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction;
  }

  async requestTransactionQuote(transactionQuoteQuery: TransactionQuoteQueryDTO): Promise<TransactionQuoteDTO> {
    // TODO transactionQuoteQuery.partnerID can optionally be used to quote differently per partner.
    // Note that that field is not required and will not be populated for unauthenticated users,
    // so we can't depend on it being there.

    if (transactionQuoteQuery.fixedAmount <= 0 || Number.isNaN(transactionQuoteQuery.fixedAmount)) {
      throw new BadRequestException("Invalid amount");
    }

    const assetService: AssetService = this.assetServiceFactory.getAssetService(
      transactionQuoteQuery.cryptoCurrencyCode,
    );
    let nobaQuote: NobaQuote;

    switch (transactionQuoteQuery.fixedSide) {
      case CurrencyType.FIAT:
        nobaQuote = await assetService.getQuoteForSpecifiedFiatAmount({
          cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
          fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
          fiatAmount: Number(transactionQuoteQuery.fixedAmount),
        });
        break;

      case CurrencyType.CRYPTO:
        nobaQuote = await assetService.getQuoteForSpecifiedCryptoQuantity({
          cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
          fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
          cryptoQuantity: Number(transactionQuoteQuery.fixedAmount),
        });
        break;

      default:
        throw new BadRequestException("Unsupported fixedSide value");
    }

    return {
      quoteID: nobaQuote.quoteID,
      fiatCurrencyCode: nobaQuote.fiatCurrency,
      cryptoCurrencyCode: nobaQuote.cryptoCurrency,
      fixedSide: transactionQuoteQuery.fixedSide,
      fixedAmount: transactionQuoteQuery.fixedAmount,
      quotedAmount:
        transactionQuoteQuery.fixedSide == CurrencyType.FIAT
          ? nobaQuote.totalCryptoQuantity
          : nobaQuote.totalFiatAmount,
      processingFee: nobaQuote.processingFeeInFiat,
      networkFee: nobaQuote.networkFeeInFiat,
      nobaFee: nobaQuote.nobaFeeInFiat,
      exchangeRate: nobaQuote.perUnitCryptoPrice,
    };
  }

  async getTransactionStatus(transactionID: string): Promise<TransactionDTO> {
    const transaction = await this.transactionsRepo.getTransaction(transactionID);
    return this.transactionsMapper.toDTO(transaction);
  }

  async getUserTransactions(userID: string, partnerID: string): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getUserTransactions(userID, partnerID)).map(transaction =>
      this.transactionsMapper.toDTO(transaction),
    );
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

  //TODO add proper logs without leaking sensitive information
  //TODO add checks like no more than N transactions per user per day, no more than N transactions per day, etc, no more than N doller transaction per day/month etc.
  async initiateTransaction(
    consumerID: string,
    partnerID: string,
    sessionKey: string,
    transactionRequest: CreateTransactionDTO,
  ): Promise<TransactionDTO> {
    // Validate that destination wallet address is a valid address for given currency
    if (!this.isValidDestinationAddress(transactionRequest.leg2, transactionRequest.destinationWalletAddress)) {
      throw new BadRequestException({
        messageForClient:
          "Invalid destination wallet address " +
          transactionRequest.destinationWalletAddress +
          " for " +
          transactionRequest.leg2,
      });
    }

    const cryptoCurrencies = await this.currencyService.getSupportedCryptocurrencies();
    if (cryptoCurrencies.filter(curr => curr.ticker === transactionRequest.leg2).length == 0) {
      throw new BadRequestException(`Unknown cryptocurrency: ${transactionRequest.leg2}`);
    }

    const fiatCurrencies = await this.currencyService.getSupportedFiatCurrencies();
    if (fiatCurrencies.filter(curr => curr.ticker === transactionRequest.leg1).length == 0) {
      throw new BadRequestException(`Unknown fiat currency: ${transactionRequest.leg1}`);
    }

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: consumerID,
      sessionKey: sessionKey,
      paymentMethodID: transactionRequest.paymentToken,
      leg1Amount: transactionRequest.leg1Amount,
      // We must round the fiat amount to 2 decimals, as that is all Checkout supports
      leg2Amount: this.roundTo2DecimalNumber(transactionRequest.leg2Amount),
      leg1: transactionRequest.leg1,
      leg2: transactionRequest.leg2,
      transactionStatus: TransactionStatus.PENDING,
      partnerID: partnerID,
      destinationWalletAddress: transactionRequest.destinationWalletAddress,
    });

    const assetService: AssetService = this.assetServiceFactory.getAssetService(transactionRequest.leg2);

    const fixedAmount =
      transactionRequest.fixedSide == CurrencyType.FIAT ? transactionRequest.leg1Amount : transactionRequest.leg2Amount;
    const quote =
      transactionRequest.fixedSide === CurrencyType.FIAT
        ? await assetService.getQuoteForSpecifiedFiatAmount({
            fiatCurrency: transactionRequest.leg1,
            cryptoCurrency: transactionRequest.leg2,
            fiatAmount: Number(fixedAmount),
          })
        : await assetService.getQuoteForSpecifiedCryptoQuantity({
            fiatCurrency: transactionRequest.leg1,
            cryptoCurrency: transactionRequest.leg2,
            cryptoQuantity: Number(fixedAmount),
          });

    // Check slippage between the original quoted transaction that the user confirmed and the quote we just received above against the non-fixed side
    // quote.quotedAmount will always be the in the currency opposite of the fixed side
    const withinSlippage =
      transactionRequest.fixedSide == CurrencyType.FIAT
        ? this.withinSlippage(transactionRequest.leg2Amount, quote.totalCryptoQuantity)
        : this.withinSlippage(transactionRequest.leg1Amount, quote.totalFiatAmount);
    if (!withinSlippage) {
      throw new BadRequestException({
        messageForClient: `Bid price is not within slippage allowed of ${
          this.nobaTransactionConfigs.slippageAllowedPercentage * 100
        }%`,
      });
    }

    // Add quote information to new transaction
    newTransaction.props.tradeQuoteID = quote.quoteID;
    newTransaction.props.nobaFee = quote.nobaFeeInFiat;
    newTransaction.props.networkFee = quote.networkFeeInFiat;
    newTransaction.props.processingFee = quote.processingFeeInFiat;
    newTransaction.props.exchangeRate = quote.perUnitCryptoPrice;
    newTransaction.props.amountPreSpread = quote.amountPreSpread;

    // Set the amount that wasn't fixed based on the quote received
    if (transactionRequest.fixedSide == CurrencyType.FIAT) {
      newTransaction.props.leg2Amount = quote.totalCryptoQuantity;
    } else {
      newTransaction.props.leg1Amount = quote.totalFiatAmount;
    }

    this.logger.debug(`Transaction: ${JSON.stringify(newTransaction.props)}`);

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
      return PendingTransactionValidationStatus.FAIL;
    }

    const cryptoWallet = this.consumerService.getCryptoWallet(consumer, transaction.props.destinationWalletAddress);
    if (cryptoWallet == null) {
      this.logger.error(
        `Attempt to initiate transaction with unknown wallet. Transaction ID: ${transaction.props._id}`,
      );
      return PendingTransactionValidationStatus.FAIL;
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
    };
    const result = await this.verificationService.transactionVerification(
      transaction.props.sessionKey,
      consumer,
      sardineTransactionInformation,
    );

    if (result.status !== KYCStatus.APPROVED) {
      // TODO(#310) Log the details to the transaction (transactionExceptions[])
      return PendingTransactionValidationStatus.FAIL;
    }

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

    try {
      // This is where transaction is accepted by us. Send email here. However this should not break the flow so addded
      // try catch block
      await this.emailService.sendTransactionInitiatedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        {
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

  private isValidDestinationAddress(curr: string, destinationWalletAdress: string): boolean {
    // Will throw an error if the currency is unknown to the tool. We should catch this in the caller and ultimately display a warning to the user that the address could not be validated.
    return validate(destinationWalletAdress, curr);
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
      const { status, statusText } = await axios.post(webhook.url, payload, this.getAxiosConfig(partner));
      if (status != 200) {
        this.logger.error(
          `Error calling ${webhook.type} at url ${webhook.url} for partner ${partner.props.name} transaction ID: ${transaction.props._id}. Error: ${status}-${statusText}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error calling ${webhook.type} at url ${webhook.url} for partner ${partner.props.name} transaction ID: ${transaction.props._id}. Error: ${err.message}`,
      );
    }
  }

  private roundTo2DecimalNumber(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}
