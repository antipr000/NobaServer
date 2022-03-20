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
import { ITransactionRepo, MockTransactionRepo } from "./repo/TransactionRepo";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { DyanamoDBUserRepo, IUserRepo } from "../user/repos/UserRepo";
import { DynamoDB } from "aws-sdk";
import Stripe from "stripe";
import { StripeService } from "../common/stripe.service";
import { Web3ProviderService } from "../common/web3providers.service";



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
    this.transactionsRepo = new MockTransactionRepo();
    this.transactionsMapper = new TransactionMapper();
    this.userRepo = new DyanamoDBUserRepo(dbProvider);
  }

  async getTransactionStatus(id: string): Promise<string> {
    return null;
  }

  //TODO add proper logs without leaking sensitive information
  async transact(userID: string, details: CreateTransactionDTO): Promise<TransactionDTO> {
    const slippageAllowed = 2; //2%, todo take from config or user input

    const user = await this.userRepo.getUser(userID);

    const leg1: string = details.tradePair.split("-")[0];
    const leg2: string = details.tradePair.split("-")[1];

    const leg1Amount = details.leg1Amount;
    const leg2Amount = details.leg2Amount;

    if (leg1 != "usd" && leg2 != "ethereum") {
      throw new Error("Only USD to ETH transaction is supported at the moment");
    }

    const currentPrice = await this.exchangeRateService.priceInFiat(leg2, leg1);
    const bidPrice = (leg1Amount * 1.0)/ leg2Amount;


    this.logger.info(`bidPrice: ${bidPrice}, currentPrice: ${currentPrice}`);

    if (! this.withinSlippage(bidPrice, currentPrice, slippageAllowed)) { 
      throw new BadRequestError({messageForClient: "Bid price is not within slippage allowed"});
    }

    const newTransaction: Transaction = Transaction.createTransaction({
      userId: userID,
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
      amount: leg1Amount*100, //in cents
      currency: 'usd', //TODO make this generic
      customer: user.props.stripeCustomerID,
      payment_method: details.paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
    };
  
    const paymentIntent = await this.stripe.paymentIntents.create(params);

    
    this.transactionsRepo.updateTransaction(Transaction.createTransaction(
      {...newTransaction.props,
         transactionStatus: TransactionStatus.FIAT_INCOMING_PENDING, 
         stripePaymentID: paymentIntent.id
      }));
    
    //TODO wait here for the transaction to complete and update the status
  
    //updating the status to fiat transaction succeeded for now
    this.transactionsRepo.updateTransaction(Transaction.createTransaction(
      {...newTransaction.props,
         transactionStatus: TransactionStatus.FIAT_INCOMING_CONFIRMED,  
         stripePaymentID: paymentIntent.id
      }));

    this.logger.info(`Transaction ${newTransaction.props.id} is waiting for payment confirmation, payment intent id: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    //*** assuming that fiat transfer completed*/

    //TODO what is transactionID on web3/ethereum chain
    await this.web3ProviderService.transferEther(leg2Amount, details.destinationWalletAdress);
    
    return undefined;
  }

  //TODO put in some utility class?
  private withinSlippage(bidPrice: number, marketPrice: number, slippagePercentage: number): boolean {
    return Math.abs(bidPrice - marketPrice) <= (slippagePercentage / 100) * bidPrice;
  }

}
