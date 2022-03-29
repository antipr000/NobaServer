import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { ExchangeRateService } from "./exchangerate.service";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { Transaction } from "./domain/Transaction";
import { TransactionStatus } from "./domain/Types";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionMapper } from "./mapper/TransactionMapper";
import Stripe from "stripe";
import { StripeService } from "../common/stripe.service";
import { Web3ProviderService } from "../common/web3providers.service";
import { Web3TransactionHandler } from "../common/domain/Types";
import { IUserRepo } from "../user/repos/UserRepo";
import { MongoDBUserRepo } from "../user/repos/MongoDBUserRepo";



@Injectable()
export class TransactionService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly transactionsRepo: ITransactionRepo;
  private readonly transactionsMapper: TransactionMapper;

  private readonly userRepo: IUserRepo;

  private readonly stripe: Stripe;


  constructor(dbProvider: DBProvider, 
    private readonly exchangeRateService: ExchangeRateService,
    private readonly web3ProviderService: Web3ProviderService,
    stripeServie: StripeService) {
    
    this.stripe = stripeServie.stripeApi;
    this.transactionsRepo = new MongoDBTransactionRepo(dbProvider);
    this.transactionsMapper = new TransactionMapper();
    this.userRepo = new MongoDBUserRepo(dbProvider);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionDTO> {
    const transaction =  await this.transactionsRepo.getTransaction(transactionId);
    return this.transactionsMapper.toDTO(transaction);
  }

  async getUserTransactions(userId: string): Promise<TransactionDTO[]> { 
    return (await this.transactionsRepo.getUserTransactions(userId)).map(transaction => this.transactionsMapper.toDTO(transaction));
  }

  //makes sure only app admins should be able to access this method, don't want to expose this method to public users
  async getAllTransactions(): Promise<TransactionDTO[]> {
    return (await this.transactionsRepo.getAll()).map(transaction => this.transactionsMapper.toDTO(transaction));
  }

  //TODO add proper logs without leaking sensitive information
  //TODO add checks like no more than N transactions per user per day, no more than N transactions per day, etc, no more than N doller transaction per day/month etc. 
  async transact(userID: string, details: CreateTransactionDTO): Promise<TransactionDTO> {
    const slippageAllowed = 2; //2%, todo take from config or user input

    const user = await this.userRepo.getUser(userID);

    const leg1: string = details.leg1;
    const leg2: string = details.leg2;

    const leg1Amount = details.leg1Amount;
    const leg2Amount = details.leg2Amount;

    if (leg1 != "usd" && leg2 != "ethereum") {
      throw new Error("Only USD to ETH transaction is supported at the moment");
    }

    const currentPrice = await this.exchangeRateService.priceInFiat(leg2, leg1);
    const bidPrice = (leg1Amount * 1.0)/ leg2Amount;


    this.logger.info(`bidPrice: ${bidPrice}, currentPrice: ${currentPrice}`);

    if (! this.withinSlippage(bidPrice, currentPrice, slippageAllowed)) { 
      throw new BadRequestError({messageForClient: `Bid price is not within slippage allowed. Current price: ${currentPrice}, bid price: ${bidPrice}`});
    }

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: userID,
      paymentMethodId: details.paymentMethodId,
      leg1Amount: details.leg1Amount,
      leg2Amount: details.leg2Amount,
      leg1: leg1,
      leg2: leg2,
      transactionStatus: TransactionStatus.INITIATED
    });

    this.transactionsRepo.createTransaction(newTransaction);

    //TODO we shouldn't be processing the below steps synchronously as there may be some partial failures
    //We should have some sort of transaction queues to process all the scenarios incrementally 

    //**** starting fiat transaction ***/

    const params: Stripe.PaymentIntentCreateParams = {
      // if we want to charge 20 USD we can use amount: 2000 USD here. Here it is a multiple of 100. So to charge 32.45 USD we can use amount: 3245
      amount: Math.ceil(leg1Amount*100), //in cents
      currency: 'usd', //TODO make this generic
      customer: user.props.stripeCustomerID,
      payment_method: details.paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
    };
  
    const paymentIntent = await this.stripe.paymentIntents.create(params);

    let updatedTransaction = Transaction.createTransaction(
      {...newTransaction.props,
         transactionStatus: TransactionStatus.FIAT_INCOMING_PENDING, 
         stripePaymentIntentId: paymentIntent.id
      });
    
    this.transactionsRepo.updateTransaction(updatedTransaction);
    
    //TODO wait here for the transaction to complete and update the status
      
    //updating the status to fiat transaction succeeded for now
    updatedTransaction = Transaction.createTransaction(
      {...updatedTransaction.props,
         transactionStatus: TransactionStatus.FIAT_INCOMING_CONFIRMED,  
         stripePaymentIntentId: paymentIntent.id
      })
    this.transactionsRepo.updateTransaction(updatedTransaction);

    this.logger.info(`Transaction ${newTransaction.props._id} is waiting for payment confirmation, payment intent id: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    //*** assuming that fiat transfer completed*/

    const promise = new Promise<TransactionDTO>((resolve, reject) => {
      const web3TransactionHandler: Web3TransactionHandler = {
        onTransactionHash: async (transactionHash: string) => {
          this.logger.info(`Transaction ${newTransaction.props._id} has crypto transaction hash: ${transactionHash}`);
          updatedTransaction = Transaction.createTransaction(
            {...updatedTransaction.props,
               transactionStatus: TransactionStatus.WALLET_OUTGOING_PENDING,  
               cryptoTransactionId: transactionHash
            });
          await this.transactionsRepo.updateTransaction(updatedTransaction);

          //TODO check with Lane or Gal if we should only confirm on the receipt of the transaction or is it fine to confirm the transaction on transaction hash
          resolve(this.transactionsMapper.toDTO(updatedTransaction));
        },

        /* onReceipt: async (receipt: any) => { 
          this.logger.info(`Transaction ${newTransaction.props.id} has crypto transaction receipt: ${JSON.stringify(receipt)}`);
        }, */
      
        onError: async (error: any) => { 
          this.logger.info(`Transaction ${newTransaction.props._id} has crypto transaction error: ${JSON.stringify(error)}`);
          await this.transactionsRepo.updateTransaction(Transaction.createTransaction({
            ...newTransaction.props,
            transactionStatus: TransactionStatus.WALLET_OUTGOING_FAILED,
            diagnosis: JSON.stringify(error)
          }));
          reject(error);
        }
      };

     this.web3ProviderService.transferEther(leg2Amount, details.destinationWalletAdress, web3TransactionHandler);
     });

    return promise;
  }

  //TODO put in some utility class?
  private withinSlippage(bidPrice: number, marketPrice: number, slippagePercentage: number): boolean {
    return Math.abs(bidPrice - marketPrice) <= (slippagePercentage / 100) * bidPrice;
  }

}
