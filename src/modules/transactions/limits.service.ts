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
  UserLimits,
} from "./domain/Limits";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { TransactionMapper } from "./mapper/TransactionMapper";
import { TransactionAllowedStatus } from "./domain/TransactionAllowedStatus";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";

@Injectable()
export class LimitsService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionsRepo: ITransactionRepo;
  private readonly transactionsMapper: TransactionMapper;

  constructor(private userService: ConsumerService) {
    this.transactionsMapper = new TransactionMapper();
    return this;
  }

  getLimits(userVerificationStatus: UserVerificationStatus): UserLimits {
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

  async canMakeTransaction(consumer: Consumer, transactionAmount: number): Promise<CheckTransactionDTO> {
    /* At this point unverified users cannot perform transactions, so leaving this commented */
    // const userVerificationStatus: UserVerificationStatus = this.userService.getVerificationStatus(consumer);

    const limits = this.getLimits(UserVerificationStatus.VERIFIED);

    return this.checkTransactionLimits(consumer, transactionAmount, limits);
  }

  async checkTransactionLimits(
    consumer: Consumer,
    transactionAmount: number,
    limits: UserLimits,
  ): Promise<CheckTransactionDTO> {
    // Check single transaction limit
    if (transactionAmount < limits.minTransaction) {
      return {
        status: TransactionAllowedStatus.TRANSACTION_TOO_SMALL,
        rangeMin: limits.minTransaction,
        rangeMax: limits.maxTransaction,
      };
    }

    if (transactionAmount > limits.maxTransaction) {
      return {
        status: TransactionAllowedStatus.TRANSACTION_TOO_LARGE,
        rangeMin: limits.minTransaction,
        rangeMax: limits.maxTransaction,
      };
    }

    /* Removed checks for daily, weekly, and total for now. It's easy enough to bring them back if we need them.
    If we do bring them back, let's check each one after we retrieve the total so we don't execute more queries than necessary. */

    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props._id,
    );

    // For some reason without casting the operands to a Number, this ends up doing string concat
    const total: number = Number(transactionAmount) + Number(monthlyTransactionAmount);
    if (total > limits.monthlyLimit) {
      // Spent + new amount exceeds monthly limit
      let maxRemaining = limits.monthlyLimit - monthlyTransactionAmount; // We have our full limit minus what we've spent so far this month remaining
      let minRemaining = limits.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.
      if (maxRemaining < 0) {
        // This would mean we've over-spent monthly limit, which should never happen
        maxRemaining = 0;
      }

      /*
        Note that minRemaining will always be the minimum transaction limit but you can have a maximum of < the minimum.
        This is because you can never, ever submit a transaction lower than the min transaction amount but you may have
        spent up to within some amount < [min transaction] in the time period.
        
        Example:
        Min transaction amount: $50
        Max transaction amount: $200
        Monthly limit: $2000
        
        Scenario: somebody has already spent $1965 of their $2000 monthly limit
        API Would return: {rangeMin: 50, rangeMax: 35, status: TransactionAllowedStatus.MONTHLY_LIMIT_REACHED}

        Callers should not display a message which indicates "min of 50 and max of 35" as that would be confusing. In
        this case the caller would simply know that the monthly transaction limit is reached and the user cannot
        submit any more transactions (even though they haven't hit $2000 yet).
      */

      return {
        status: TransactionAllowedStatus.MONTHLY_LIMIT_REACHED,
        rangeMin: minRemaining,
        rangeMax: maxRemaining,
      };
    }

    return {
      status: TransactionAllowedStatus.ALLOWED,
      rangeMin: limits.minTransaction,
      rangeMax: limits.maxTransaction,
    };
  }
}
