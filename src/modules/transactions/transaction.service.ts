import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import Stripe from "stripe";
import { Logger } from "winston";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { DBProvider } from "../../infraproviders/DBProvider";
import { Web3TransactionHandler } from "../common/domain/Types";
import { StripeService } from "../common/stripe.service";
import { CurrencyDTO } from "../common/dto/CurrencyDTO";
import { UserService } from "../user/user.service";
import { Transaction } from "./domain/Transaction";
import { TransactionStatus } from "./domain/Types";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { ExchangeRateService } from "./exchangerate.service";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { ZeroHashService } from "./zerohash.service";
import { validate } from "multicoin-address-validator";
import { Cache } from "cache-manager";

@Injectable()
export class TransactionService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionsRepo: ITransactionRepo;

  @Inject(UserService)
  private readonly userService: UserService;

  private readonly transactionsMapper: TransactionMapper;

  @Inject(CACHE_MANAGER)
  private cacheManager: Cache;

  private readonly stripe: Stripe;

  // This is the id used at coinGecko, so do not change the allowed constants below
  private readonly allowedFiats: string[] = ["USD"];
  private allowedCryptoCurrencies = new Array<string>(); // = ["ETH", "terrausd", "terra-luna"];

  private readonly slippageAllowed = 2; //2%, todo take from config or user input

  constructor(
    dbProvider: DBProvider,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly zeroHashService: ZeroHashService,
    stripeService: StripeService,
  ) {
    this.stripe = stripeService.stripeApi;
    this.transactionsMapper = new TransactionMapper();
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
  async transact(userID: string, details: CreateTransactionDTO): Promise<TransactionDTO> {
    const leg1: string = details.leg1;
    const leg2: string = details.leg2;
    const destinationWalletAdress: string = details.destinationWalletAddress;

    // Validate that destination wallet address is a valid address for given currency
    if (!this.isValidDestinationAddress(leg2, destinationWalletAdress)) {
      throw new BadRequestError({
        messageForClient: "Invalid destination wallet address " + destinationWalletAdress + " for " + leg2,
      });
    }

    const user = await this.userService.getUserInternal(userID);

    const leg1Amount = details.leg1Amount;
    const leg2Amount = details.leg2Amount;

    if (this.allowedCryptoCurrencies.length == 0) {
      // TODO: unsafe code. We should only do this once; waiting for Ankit's refactor and we can re-evaluate.
      const currencies = (await this.cacheManager.get("cryptocurrencies")) as CurrencyDTO[];
      currencies.forEach(curr => {
        this.allowedCryptoCurrencies.push(curr.ticker);
      });
    }

    //this.cacheManager.
    if (!(this.allowedFiats.includes(leg1) && this.allowedCryptoCurrencies.includes(leg2))) {
      throw new BadRequestError({
        messageForClient:
          "Supported leg1 (i.e fiat) are " +
          this.allowedFiats.join(", ") +
          " and leg2 (i.e crypto) are " +
          this.allowedCryptoCurrencies.join(", "),
      });
    }

    const currentPrice = await this.exchangeRateService.priceInFiat(leg2, leg1);
    const bidPrice = (leg1Amount * 1.0) / leg2Amount;

    if (!this.withinSlippage(bidPrice, currentPrice, this.slippageAllowed)) {
      throw new BadRequestError({
        messageForClient: `Bid price is not within slippage allowed. Current price: ${currentPrice}, bid price: ${bidPrice}`,
      });
    }

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: userID,
      paymentMethodID: details.paymentMethodID,
      leg1Amount: details.leg1Amount,
      leg2Amount: details.leg2Amount,
      leg1: leg1,
      leg2: leg2,
      transactionStatus: TransactionStatus.INITIATED,
      destinationWalletAddress: details.destinationWalletAddress,
    });

    this.transactionsRepo.createTransaction(newTransaction);

    //TODO we shouldn't be processing the below steps synchronously as there may be some partial failures
    //We should have some sort of transaction queues to process all the scenarios incrementally

    //**** starting fiat transaction ***/

    // todo refactor this piece when we have the routing flow in place
    // create a method in paymentmethods.service.ts instead for Stripe and checkout
    const params: Stripe.PaymentIntentCreateParams = {
      // if we want to charge 20 USD we can use amount: 2000 USD here. Here it is a multiple of 100. So to charge 32.45 USD we can use amount: 3245
      amount: Math.ceil(leg1Amount * 100), //in cents
      currency: "usd", //TODO make this generic
      customer: user.props.stripeCustomerID,
      payment_method: details.paymentMethodID,
      confirmation_method: "automatic",
      confirm: true,
    };

    const paymentIntent = await this.stripe.paymentIntents.create(params);

    let updatedTransaction = Transaction.createTransaction({
      ...newTransaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_PENDING,
      stripePaymentIntentId: paymentIntent.id,
    });

    this.transactionsRepo.updateTransaction(updatedTransaction);

    //TODO wait here for the transaction to complete and update the status

    //updating the status to fiat transaction succeeded for now
    updatedTransaction = Transaction.createTransaction({
      ...updatedTransaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_CONFIRMED,
      stripePaymentIntentId: paymentIntent.id,
    });
    this.transactionsRepo.updateTransaction(updatedTransaction);

    this.logger.info(
      `Transaction ${newTransaction.props._id} is waiting for payment confirmation, payment intent id: ${paymentIntent.id}, status: ${paymentIntent.status}`,
    );

    //*** assuming that fiat transfer completed*/

    const promise = new Promise<TransactionDTO>((resolve, reject) => {
      const web3TransactionHandler: Web3TransactionHandler = {
        onTransactionHash: async (transactionHash: string) => {
          this.logger.info(`Transaction ${newTransaction.props._id} has crypto transaction hash: ${transactionHash}`);
          updatedTransaction = Transaction.createTransaction({
            ...updatedTransaction.props,
            transactionStatus: TransactionStatus.WALLET_OUTGOING_PENDING,
            cryptoTransactionId: transactionHash,
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
              transactionStatus: TransactionStatus.WALLET_OUTGOING_FAILED,
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
        "fiat",
        web3TransactionHandler,
      );
    });

    return promise;
  }

  //TODO put in some utility class?
  private withinSlippage(bidPrice: number, marketPrice: number, slippagePercentage: number): boolean {
    return Math.abs(bidPrice - marketPrice) <= (slippagePercentage / 100) * bidPrice;
  }

  private isValidDestinationAddress(curr: string, destinationWalletAdress: string): boolean {
    // Will throw an error if the currency is unknown to the tool. We should catch this in the caller and ultimately display a warning to the user that the address could not be validated.
    return validate(destinationWalletAdress, curr);
  }
}
