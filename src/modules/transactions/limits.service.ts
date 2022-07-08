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
  TransactionLimit,
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
        minTransaction: TransactionLimit.min_transaction,
        maxTransaction: TransactionLimit.max_transaction,
      };
    } else if (userVerificationStatus === UserVerificationStatus.PARTIALLY_VERIFIED) {
      return {
        dailyLimit: DailyLimitBuyOnly.partial_kyc_max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.partial_kyc_max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.partial_kyc_max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.partial_kyc_max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.partial_kyc_max_amount_limit,
        minTransaction: TransactionLimit.min_transaction,
        maxTransaction: TransactionLimit.max_transaction,
      };
    } else {
      return {
        dailyLimit: DailyLimitBuyOnly.max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.max_amount_limit,
        minTransaction: TransactionLimit.min_transaction,
        maxTransaction: TransactionLimit.max_transaction,
      };
    }
  }

  async canMakeTransaction(consumer: Consumer, transactionAmount: number): Promise<TransactionAllowedStatus> {
    /* At this point unverified users cannot perform transactions, so leaving this commented */
    // const userVerificationStatus: UserVerificationStatus = this.userService.getVerificationStatus(consumer);

    const limits = this.getLimits(UserVerificationStatus.VERIFIED);
    console.log(limits);

    // Check single transaction limit
    if (transactionAmount < limits.minTransaction) {
      return TransactionAllowedStatus.TRANSACTION_TOO_SMALL;
    }

    if (transactionAmount > limits.maxTransaction) {
      return TransactionAllowedStatus.TRANSACTION_TOO_LARGE;
    }

    /* Removed checks for daily, weekly, and total for now. It's easy enough to bring them back if we need them.
    If we do bring them back, let's check each one after we retrieve the total so we don't execute more queries than necessary. */

    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props._id,
    );

    // For some reason without casting the operands to a Number, this ends up doing string concat
    const total: number = Number(transactionAmount) + Number(monthlyTransactionAmount);
    if (total > limits.monthlyLimit) return TransactionAllowedStatus.MONTHLY_LIMIT_REACHED;

    return TransactionAllowedStatus.ALLOWED;
  }
}
