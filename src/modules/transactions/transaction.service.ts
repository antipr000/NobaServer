import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { validate } from "multicoin-address-validator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CurrencyService } from "../common/currency.service";
import { CurrencyType, Web3TransactionHandler } from "../common/domain/Types";
import { ConsumerService } from "../consumer/consumer.service";
import { PaymentMethods } from "../consumer/domain/PaymentMethods";
import { KYCStatus } from "../consumer/domain/VerificationStatus";
import { TransactionInformation } from "../verification/domain/TransactionInformation";
import { VerificationService } from "../verification/verification.service";
import { Transaction } from "./domain/Transaction";
import { CryptoTransactionRequestResult, CryptoTransactionStatus, TransactionStatus } from "./domain/Types";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TransactionQuoteDTO } from "./dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "./dto/TransactionQuoteQuery.DTO";
import { ExchangeRateService } from "./exchangerate.service";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { ZeroHashService } from "./zerohash.service";
import { EmailService } from "../common/email.service";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { NobaTransactionConfigs, NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CryptoWallets } from "../consumer/domain/CryptoWallets";

@Injectable()
export class TransactionService {
  private readonly transactionsMapper: TransactionMapper;
  private readonly nobaTransactionConfigs: NobaTransactionConfigs;

  // This is the id used at coinGecko, so do not change the allowed constants below
  private readonly allowedFiats: string[] = ["USD"];
  private allowedCryptoCurrencies = new Array<string>(); // = ["ETH", "terrausd", "terra-luna"];

  private readonly slippageAllowed = 2; //2%, todo take from config or user input

  constructor(
    configService: CustomConfigService,
    private readonly currencyService: CurrencyService,
    private readonly zeroHashService: ZeroHashService,
    private readonly verificationService: VerificationService,
    private readonly exchangeRateService: ExchangeRateService,
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

    if (transactionQuoteQuery.fixedAmount <= 0 || transactionQuoteQuery.fixedAmount == Number.NaN) {
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
    console.log(estimatedNetworkFeeFromZeroHash);

    const networkFeeInFiat = Number(estimatedNetworkFeeFromZeroHash["message"]["total_notional"]);

    if (transactionQuoteQuery.fixedSide == CurrencyType.FIAT) {
      const fixedAmountFiat = transactionQuoteQuery.fixedAmount;
      const creditCardFees = fixedAmountFiat * creditCardFeePercent + creditCardFeeDollars;
      const feeSubtotal = networkFeeInFiat + creditCardFees + nobaFlatFeeDollars;
      const preSpreadAmount = fixedAmountFiat - feeSubtotal;
      const priceToQuoteUSD = preSpreadAmount / (1 + nobaSpreadPercent);
      const totalFees = preSpreadAmount - priceToQuoteUSD + feeSubtotal;

      const quote = await this.exchangeRateService.getQuote(
        transactionQuoteQuery.cryptoCurrencyCode,
        transactionQuoteQuery.fiatCurrencyCode,
        priceToQuoteUSD,
        CurrencyType.CRYPTO,
      );
      console.log(quote);
      const costPerUnit = Number(quote["price"]);

      this.logger.info(`
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
        fiatCurrencyCode: transactionQuoteQuery.fiatCurrencyCode,
        cryptoCurrencyCode: transactionQuoteQuery.cryptoCurrencyCode,
        fixedSide: transactionQuoteQuery.fixedSide,
        fixedAmount: transactionQuoteQuery.fixedAmount,
        quotedAmount: priceToQuoteUSD / costPerUnit,
        processingFee: totalFees,
        networkFee: networkFeeInFiat,
        exchangeRate: costPerUnit,
      };

      this.logger.debug("Transaction quote: " + JSON.stringify(transactionQuote));

      return transactionQuote;
    } else if (transactionQuoteQuery.fixedSide == CurrencyType.CRYPTO) {
      const fixedAmountCrypto = transactionQuoteQuery.fixedAmount;

      const quote = await this.exchangeRateService.getQuote(
        transactionQuoteQuery.cryptoCurrencyCode,
        transactionQuoteQuery.fiatCurrencyCode,
        fixedAmountCrypto,
        CurrencyType.FIAT,
      );
      const costPerUnit = Number(quote["price"]);

      const cryptoWithSpread = costPerUnit * (1 + nobaSpreadPercent);
      const fiatCostPostSpread = fixedAmountCrypto * cryptoWithSpread;
      const costBeforeCCFee = fiatCostPostSpread + nobaFlatFeeDollars + networkFeeInFiat;
      const creditCardCharge = (costBeforeCCFee + creditCardFeeDollars) / (1 - creditCardFeePercent);
      const processingFees = creditCardCharge - costBeforeCCFee;

      this.logger.info(`
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
        fiatCurrencyCode: transactionQuoteQuery.fiatCurrencyCode,
        cryptoCurrencyCode: transactionQuoteQuery.cryptoCurrencyCode,
        fixedSide: transactionQuoteQuery.fixedSide,
        fixedAmount: transactionQuoteQuery.fixedAmount,
        quotedAmount: creditCardCharge,
        processingFee: processingFees,
        networkFee: networkFeeInFiat,
        exchangeRate: costPerUnit,
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
  async transact(userID: string, sessionKey: string, details: CreateTransactionDTO): Promise<TransactionDTO> {
    const leg1: string = details.leg1;
    const leg2: string = details.leg2;
    const destinationWalletAdress: string = details.destinationWalletAddress;

    // Validate that destination wallet address is a valid address for given currency
    if (!this.isValidDestinationAddress(leg2, destinationWalletAdress)) {
      throw new BadRequestException({
        messageForClient: "Invalid destination wallet address " + destinationWalletAdress + " for " + leg2,
      });
    }

    const user = await this.consumerService.getConsumer(userID);

    const leg1Amount = details.leg1Amount;
    const leg2Amount = details.leg2Amount;

    if (this.allowedCryptoCurrencies.length == 0) {
      // TODO: unsafe code. We should only do this once; waiting for Ankit's refactor and we can re-evaluate.
      const currencies = await this.currencyService.getSupportedCryptocurrencies();
      currencies.forEach(curr => {
        this.allowedCryptoCurrencies.push(curr.ticker);
      });
    }

    //this.cacheManager.
    if (!(this.allowedFiats.includes(leg1) && this.allowedCryptoCurrencies.includes(leg2))) {
      throw new BadRequestException({
        messageForClient:
          "Supported leg1 (i.e fiat) are " +
          this.allowedFiats.join(", ") +
          " and leg2 (i.e crypto) are " +
          this.allowedCryptoCurrencies.join(", "),
      });
    }

    if (!this.withinSlippage(leg2, leg1, leg2Amount, leg1Amount)) {
      throw new BadRequestError({
        messageForClient: `Bid price is not within slippage allowed of ${this.slippageAllowed}%`,
      });
    }

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: userID,
      paymentMethodID: details.paymentToken,
      leg1Amount: details.leg1Amount,
      leg2Amount: details.leg2Amount,
      leg1: leg1,
      leg2: leg2,
      transactionStatus: TransactionStatus.PENDING,
      destinationWalletAddress: details.destinationWalletAddress,
    });

    this.transactionsRepo.createTransaction(newTransaction);

    const paymentMethodList: PaymentMethods[] = user.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === details.paymentToken,
    );

    if (paymentMethodList.length === 0) {
      throw new BadRequestException("Payment Token is invalid!");
    }

    const paymentMethod = paymentMethodList[0];

    // Check Sardine for AML
    const sardineTransactionInformation: TransactionInformation = {
      transactionID: newTransaction.props._id,
      amount: newTransaction.props.leg1Amount,
      currencyCode: newTransaction.props.leg1,
      first6DigitsOfCard: paymentMethod.first6Digits,
      last4DigitsOfCard: paymentMethod.last4Digits,
      cardID: paymentMethod.paymentToken,
      cryptoCurrencyCode: newTransaction.props.leg2,
      walletAddress: newTransaction.props.destinationWalletAddress,
    };
    const result = await this.verificationService.transactionVerification(
      sessionKey,
      user,
      sardineTransactionInformation,
    );

    if (result.status !== KYCStatus.OLD_APPROVED) {
      throw new BadRequestException("Compliance checks have failed. You will receive an email regarding next steps.");
    }

    if (result.walletStatus) {
      const cryptoWallet: CryptoWallets = {
        walletName: "",
        address: newTransaction.props.destinationWalletAddress,
        chainType: "",
        isEVMCompatible: false,
        status: result.walletStatus,
      };
      await this.consumerService.addOrUpdateCryptoWallet(user.props._id, cryptoWallet);
    }

    if (result.paymentMethodStatus) {
      await this.consumerService.updatePaymentMethod(user.props._id, {
        ...paymentMethod,
        status: result.paymentMethodStatus,
      });
    }

    try {
      // This is where transaction is accepted by us. Send email here. However this should not break the flow so addded
      // try catch block
      await this.emailService.sendTransactionInitiatedEmail(
        user.props.firstName,
        user.props.lastName,
        user.props.email,
        {
          transactionID: newTransaction.props._id,
          createdDate: new Date().toDateString(),
          paymentMethod: paymentMethod.cardType,
          last4Digits: paymentMethod.last4Digits,
          currencyCode: newTransaction.props.leg1,
          subtotalPrice: newTransaction.props.leg1Amount,
          processingFee: 0, // TODO: Update processing fee
          networkFee: 0, // TODO: Update network fee
          totalPrice: newTransaction.props.leg1Amount,
          cryptoAmount: newTransaction.props.leg2Amount,
          cryptoCurrency: newTransaction.props.leg2,
        },
      );
    } catch (e) {
      this.logger.error("Failed to send email at transaction initiation. " + e);
    }

    //TODO we shouldn't be processing the below steps synchronously as there may be some partial failures
    //We should have some sort of transaction queues to process all the scenarios incrementally

    //**** starting fiat transaction ***/

    // todo refactor this piece when we have the routing flow in place
    const payment = await this.consumerService.requestCheckoutPayment(
      details.paymentToken,
      leg1Amount,
      leg1,
      newTransaction.props._id,
    );
    let updatedTransaction = Transaction.createTransaction({
      ...newTransaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
      checkoutPaymentID: payment["id"],
    });

    this.transactionsRepo.updateTransaction(updatedTransaction);

    //TODO wait here for the transaction to complete and update the status

    //updating the status to fiat transaction succeeded for now
    updatedTransaction = Transaction.createTransaction({
      ...updatedTransaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      checkoutPaymentID: payment["id"],
    });
    this.transactionsRepo.updateTransaction(updatedTransaction);

    //*** assuming that fiat transfer completed*/

    const promise = new Promise<TransactionDTO>((resolve, reject) => {
      const web3TransactionHandler: Web3TransactionHandler = {
        onTransactionHash: async (transactionHash: string) => {
          this.logger.info(`Transaction ${newTransaction.props._id} has crypto transaction hash: ${transactionHash}`);
          updatedTransaction = Transaction.createTransaction({
            ...updatedTransaction.props,
            transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
            //cryptoTransactionId: transactionHash, // This is not coming at this time. @soham is working on a fix
          });
          await this.transactionsRepo.updateTransaction(updatedTransaction);

          //TODO check with Lane or Gal if we should only confirm on the receipt of the transaction or is it fine to confirm the transaction on transaction hash
          resolve(this.transactionsMapper.toDTO(updatedTransaction));
        },

        /* onReceipt: async (receipt: any) => { 
          this.logger.info(`Transaction ${newTransaction.props.id} has crypto transaction receipt: ${JSON.stringify(receipt)}`);
        }, */

        onError: async (error: any) => {
          this.logger.info(
            `Transaction ${newTransaction.props._id} has crypto transaction error: ${JSON.stringify(error)}`,
          );
          await this.transactionsRepo.updateTransaction(
            Transaction.createTransaction({
              ...newTransaction.props,
              transactionStatus: TransactionStatus.CRYPTO_OUTGOING_FAILED,
              diagnosis: JSON.stringify(error),
            }),
          );
          reject(error);
        },
      };

      // leg1 is fiat, leg2 is crypto
      this.zeroHashService.transferCryptoToDestinationWallet(
        user.props,
        leg1,
        leg2,
        details.destinationWalletAddress,
        leg1Amount,
        leg2Amount,
        CurrencyType.FIAT,
        web3TransactionHandler,
      );
    });

    return promise;
  }

  public async initiateCryptoTransaction(transaction: Transaction): Promise<CryptoTransactionRequestResult> {
    //Check slippage here and call zero hash service
    // add risk controller here to reconcile that fiat and crypto balance are in sync!!

    // break above logic here
    // transaction.props.cryptoTransactionId = "";
    return null;
  }

  public async cryptoTransactionStatus(transaction: Transaction): Promise<CryptoTransactionStatus> {
    // break above logic here
    //
    return null;
  }

  public async withinSlippage(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoAmount: number,
    fiatAmount: number,
  ): Promise<boolean> {
    const marketPrice = await this.exchangeRateService.priceInFiat(cryptoCurrency, fiatCurrency);
    const bidPrice = (fiatAmount * 1.0) / cryptoAmount;
    return Math.abs(bidPrice - marketPrice) <= (this.slippageAllowed / 100) * bidPrice;
  }

  private isValidDestinationAddress(curr: string, destinationWalletAdress: string): boolean {
    // Will throw an error if the currency is unknown to the tool. We should catch this in the caller and ultimately display a warning to the user that the address could not be validated.
    return validate(destinationWalletAdress, curr);
  }
}
