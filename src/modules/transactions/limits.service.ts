import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
import { UserVerificationStatus } from "../consumer/domain/UserVerificationStatus";
import { Consumer } from "../consumer/domain/Consumer";
import {
  TransactionLimitBuyOnly,
  DailyLimitBuyOnly,
  WeeklyLimitBuyOnly,
  MonthlyLimitBuyOnly,
  LifetimeLimitBuyOnly,
} from "./domain/Limits";
import { DBProvider } from "../../infraproviders/DBProvider";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionAllowedStatus } from "./domain/TransactionAllowedStatus";

@Injectable()
export class LimitsService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  private readonly transactionsRepo: ITransactionRepo;
  private readonly transactionsMapper: TransactionMapper;

  constructor(dbProvider: DBProvider, private userService: ConsumerService) {
    this.transactionsRepo = new MongoDBTransactionRepo(dbProvider);
    this.transactionsMapper = new TransactionMapper();
    return this;
  }

  private getLimits(userVerificationStatus: UserVerificationStatus) {
    if (userVerificationStatus === UserVerificationStatus.NOT_VERIFIED) {
      return {
        dailyLimit: DailyLimitBuyOnly.no_kyc_max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.no_kyc_max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.no_kyc_max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.no_kyc_max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.no_kyc_max_amount_limit,
      };
    } else if (userVerificationStatus === UserVerificationStatus.PARTIALLY_VERIFIED) {
      return {
        dailyLimit: DailyLimitBuyOnly.partial_kyc_max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.partial_kyc_max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.partial_kyc_max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.partial_kyc_max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.partial_kyc_max_amount_limit,
      };
    } else {
      return {
        dailyLimit: DailyLimitBuyOnly.max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.max_amount_limit,
      };
    }
  }

  async canMakeTransaction(consumer: Consumer, transactionAmount: number): Promise<TransactionAllowedStatus> {
    const userVerificationStatus: UserVerificationStatus = this.userService.getVerificationStatus(consumer);

    const dailyTransactionAmount: number = await this.transactionsRepo.getDailyUserTransactionAmount(
      consumer.props._id,
    );
    const weeklyTransactionAmount: number = await this.transactionsRepo.getWeeklyUserTransactionAmount(
      consumer.props._id,
    );
    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props._id,
    );
    const totalTransactionAmount: number = await this.transactionsRepo.getTotalUserTransactionAmount(
      consumer.props._id,
    );

    const limits = this.getLimits(userVerificationStatus);
    console.log(limits);
    console.log(transactionAmount + totalTransactionAmount);

    if (transactionAmount > limits.transactionLimit) return TransactionAllowedStatus.TRANSACTION_LIMIT_REACHED;
    if (transactionAmount + dailyTransactionAmount > limits.dailyLimit)
      return TransactionAllowedStatus.DAILY_LIMIT_REACHED;
    if (transactionAmount + weeklyTransactionAmount > limits.weeklyLimit)
      return TransactionAllowedStatus.WEEKLY_LIMIT_REACHED;
    if (transactionAmount + monthlyTransactionAmount > limits.monthlyLimit)
      return TransactionAllowedStatus.MONTHLY_LIMIT_REACHED;
    if (transactionAmount + totalTransactionAmount > limits.totalLimit)
      return TransactionAllowedStatus.MAX_LIMIT_REACHED;
    return TransactionAllowedStatus.ALLOWED;
  }
}
