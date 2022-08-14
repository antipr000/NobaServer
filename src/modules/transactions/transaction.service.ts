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
import { CryptoTransactionRequestResult, CryptoTransactionStatus, TransactionStatus } from "./domain/Types";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TransactionQuoteDTO } from "./dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "./dto/TransactionQuoteQuery.DTO";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { ZeroHashService } from "./zerohash.service";
import { EmailService } from "../common/email.service";
import { NobaTransactionConfigs, NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CryptoWallet } from "../consumer/domain/CryptoWallet";
import { Consumer } from "../consumer/domain/Consumer";
import { PendingTransactionValidationStatus } from "../consumer/domain/Types";

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
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject("TransactionRepo") private readonly transactionsRepo: ITransactionRepo,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {
    this.transactionsMapper = new TransactionMapper();
    this.nobaTransactionConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction;
  }

  async getTransactionQuote(transactionQuoteQuery: TransactionQuoteQueryDTO): Promise<TransactionQuoteDTO> {
    if (Object.values(CurrencyType).indexOf(transactionQuoteQuery.fixedSide) == -1) {
      throw new BadRequestException("Unsupported fixedSide value");
    }

    if (transactionQuoteQuery.fixedAmount <= 0 || Number.isNaN(transactionQuoteQuery.fixedAmount)) {
      throw new BadRequestException("Invalid amount");
    }

    const nobaSpreadPercent = this.nobaTransactionConfigs.spreadPercentage;
    const nobaFlatFeeDollars = this.nobaTransactionConfigs.flatFeeDollars;
    const creditCardFeePercent = this.nobaTransactionConfigs.dynamicCreditCardFeePercentage;
    const creditCardFeeDollars = this.nobaTransactionConfigs.fixedCreditCardFee;

    // Get network / gas fees
    const estimatedNetworkFeeFromZeroHash = await this.zeroHashService.estimateNetworkFee(
      transactionQuoteQuery.cryptoCurrencyCode,
      transactionQuoteQuery.fiatCurrencyCode,
    );
    this.logger.debug(estimatedNetworkFeeFromZeroHash);

    const networkFeeInFiat = Number(estimatedNetworkFeeFromZeroHash["message"]["total_notional"]);

    if (transactionQuoteQuery.fixedSide == CurrencyType.FIAT) {
      const fixedAmountFiat = transactionQuoteQuery.fixedAmount;
      // TODO(#306): It says percentage, but not actually calculating percentage.
      const creditCardFees = fixedAmountFiat * creditCardFeePercent + creditCardFeeDollars;
      const feeSubtotal = networkFeeInFiat + creditCardFees + nobaFlatFeeDollars;
      const preSpreadAmount = fixedAmountFiat - feeSubtotal;
      const priceToQuoteUSD = preSpreadAmount / (1 + nobaSpreadPercent);

      const quote = await this.zeroHashService.requestQuote(
        transactionQuoteQuery.cryptoCurrencyCode,
        transactionQuoteQuery.fiatCurrencyCode,
        priceToQuoteUSD,
        CurrencyType.FIAT,
      );
      this.logger.debug(quote);
      const costPerUnit = Number(quote["message"]["price"]);
      const rateWithSpread = costPerUnit * (1 + nobaSpreadPercent);

      this.logger.debug(`
      FIAT FIXED (${transactionQuoteQuery.fiatCurrencyCode}):\t\t${fixedAmountFiat}
      NETWORK FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${networkFeeInFiat}
      PROCESSING FEES (${transactionQuoteQuery.fiatCurrencyCode}):\t${creditCardFees}
      NOBA FLAT FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${nobaFlatFeeDollars}
      PRE-SPREAD (${transactionQuoteQuery.fiatCurrencyCode}):\t\t${preSpreadAmount}
      QUOTE PRICE (${transactionQuoteQuery.fiatCurrencyCode}):\t${priceToQuoteUSD}      
      ESTIMATED CRYPTO (${transactionQuoteQuery.cryptoCurrencyCode}):\t${priceToQuoteUSD / costPerUnit}
      SPREAD REVENUE (${transactionQuoteQuery.fiatCurrencyCode}):\t${preSpreadAmount - priceToQuoteUSD}
      ZERO HASH FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${fixedAmountFiat * 0.007}
      NOBA REVENUE (${transactionQuoteQuery.fiatCurrencyCode}):\t${
        preSpreadAmount - priceToQuoteUSD + nobaFlatFeeDollars - fixedAmountFiat * 0.007
      }
      `);

      const transactionQuote: TransactionQuoteDTO = {
        quoteID: quote["message"].quote_id,
        fiatCurrencyCode: transactionQuoteQuery.fiatCurrencyCode,
        cryptoCurrencyCode: transactionQuoteQuery.cryptoCurrencyCode,
        fixedSide: transactionQuoteQuery.fixedSide,
        fixedAmount: transactionQuoteQuery.fixedAmount,
        quotedAmount: priceToQuoteUSD / costPerUnit,
        processingFee: creditCardFees,
        networkFee: networkFeeInFiat,
        nobaFee: nobaFlatFeeDollars,
        exchangeRate: rateWithSpread,
      };

      this.logger.debug("Transaction quote: " + JSON.stringify(transactionQuote));

      return transactionQuote;
    } else if (transactionQuoteQuery.fixedSide == CurrencyType.CRYPTO) {
      const fixedAmountCrypto = transactionQuoteQuery.fixedAmount;

      const quote = await this.zeroHashService.requestQuote(
        transactionQuoteQuery.cryptoCurrencyCode,
        transactionQuoteQuery.fiatCurrencyCode,
        fixedAmountCrypto,
        CurrencyType.CRYPTO,
      );
      const costPerUnit = Number(quote["message"]["price"]);

      const rateWithSpread = costPerUnit * (1 + nobaSpreadPercent);
      const fiatCostPostSpread = fixedAmountCrypto * rateWithSpread;
      const costBeforeCCFee = fiatCostPostSpread + nobaFlatFeeDollars + networkFeeInFiat;
      const creditCardCharge = (costBeforeCCFee + creditCardFeeDollars) / (1 - creditCardFeePercent);
      const processingFees = creditCardCharge - costBeforeCCFee;

      this.logger.debug(`
      CRYPTO FIXED (${transactionQuoteQuery.cryptoCurrencyCode}):\t${fixedAmountCrypto}
      POST-SPREAD (${transactionQuoteQuery.fiatCurrencyCode}):\t${fiatCostPostSpread}
      NETWORK FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${networkFeeInFiat}
      NOBA FLAT FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${nobaFlatFeeDollars}
      COST BEFORE CC FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${costBeforeCCFee}
      CREDIT CARD CHARGE (${transactionQuoteQuery.fiatCurrencyCode}):\t${creditCardCharge}
      PROCESSING FEES (${transactionQuoteQuery.fiatCurrencyCode}):\t${processingFees}
      NOBA COST (${transactionQuoteQuery.fiatCurrencyCode}):\t\t${costPerUnit * fixedAmountCrypto}
      ZERO HASH FEE (${transactionQuoteQuery.fiatCurrencyCode}):\t${creditCardCharge * 0.007}
      NOBA REVENUE (${transactionQuoteQuery.fiatCurrencyCode}):\t${
        nobaFlatFeeDollars + fiatCostPostSpread - costPerUnit * fixedAmountCrypto - creditCardCharge * 0.007
      }
      `);

      const transactionQuote: TransactionQuoteDTO = {
        quoteID: quote["message"].quote_id,
        fiatCurrencyCode: transactionQuoteQuery.fiatCurrencyCode,
        cryptoCurrencyCode: transactionQuoteQuery.cryptoCurrencyCode,
        fixedSide: transactionQuoteQuery.fixedSide,
        fixedAmount: transactionQuoteQuery.fixedAmount,
        quotedAmount: creditCardCharge,
        processingFee: processingFees,
        networkFee: networkFeeInFiat,
        nobaFee: nobaFlatFeeDollars,
        exchangeRate: rateWithSpread,
      };

      this.logger.debug("Transaction quote: " + JSON.stringify(transactionQuote));

      return transactionQuote;
    } else {
      // Should never get here because of check at top of method, but we have to return or throw something
      throw new BadRequestException("Unsupported fixedSide value");
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionDTO> {
    const transaction = await this.transactionsRepo.getTransaction(transactionId);
    return this.transactionsMapper.toDTO(transaction);
  }

  async getUserTransactions(userId: string): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getUserTransactions(userId)).map(transaction =>
      this.transactionsMapper.toDTO(transaction),
    );
  }

  async getTransactionsInInterval(userId: string, fromDate: Date, toDate: Date): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getUserTransactionInAnInterval(userId, fromDate, toDate)).map(transaction =>
      this.transactionsMapper.toDTO(transaction),
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
      leg2Amount: transactionRequest.leg2Amount,
      leg1: transactionRequest.leg1,
      leg2: transactionRequest.leg2,
      transactionStatus: TransactionStatus.PENDING,
      destinationWalletAddress: transactionRequest.destinationWalletAddress,
    });

    const fixedAmount =
      transactionRequest.fixedSide == CurrencyType.FIAT ? transactionRequest.leg1Amount : transactionRequest.leg2Amount;
    const quote = await this.getTransactionQuote({
      cryptoCurrencyCode: transactionRequest.leg2,
      fiatCurrencyCode: transactionRequest.leg1,
      fixedAmount: fixedAmount,
      fixedSide: transactionRequest.fixedSide,
    });

    // Check slippage between the original quoted transaction that the user confirmed and the quote we just received above against the non-fixed side
    // quote.quotedAmount will always be the in the currency opposite of the fixed side
    const withinSlippage =
      transactionRequest.fixedSide == CurrencyType.FIAT
        ? this.withinSlippage(transactionRequest.leg2Amount, quote.quotedAmount)
        : this.withinSlippage(transactionRequest.leg1Amount, quote.quotedAmount);
    if (!withinSlippage) {
      throw new BadRequestException({
        messageForClient: `Bid price is not within slippage allowed of ${
          this.nobaTransactionConfigs.slippageAllowedPercentage * 100
        }%`,
      });
    }

    // Add quote information to new transaction
    newTransaction.props.tradeQuoteID = quote.quoteID;
    newTransaction.props.nobaFee = quote.nobaFee;
    newTransaction.props.networkFee = quote.networkFee;
    newTransaction.props.processingFee = quote.processingFee;
    newTransaction.props.exchangeRate = quote.exchangeRate;

    // Set the amount that wasn't fixed based on the quote received
    if (transactionRequest.fixedSide == CurrencyType.FIAT) {
      newTransaction.props.leg2Amount = quote.quotedAmount;
    } else {
      newTransaction.props.leg1Amount = quote.quotedAmount;
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
      this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
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
      const cryptoWallet: CryptoWallet = {
        //walletName: "",
        address: transaction.props.destinationWalletAddress,
        //chainType: "",
        isEVMCompatible: false,
        status: result.walletStatus,
      };
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

  public async initiateCryptoTransaction(
    consumer: Consumer,
    transaction: Transaction,
  ): Promise<CryptoTransactionRequestResult> {
    // Call ZeroHash to execute crypto transaction
    const result = await this.zeroHashService.initiateCryptoTransfer(consumer.props, transaction);

    return result;
  }

  public async checkTradeStatus(transaction: Transaction): Promise<CryptoTransactionStatus> {
    return await this.zeroHashService.checkTradeStatus(transaction);
  }

  public async moveCryptoToConsumerWallet(consumer: Consumer, transaction: Transaction): Promise<string> {
    return await this.zeroHashService.moveCryptoToConsumerWallet(consumer.props, transaction);
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
}
