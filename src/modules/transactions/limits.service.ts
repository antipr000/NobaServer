import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Consumer } from "../consumer/domain/Consumer";
import { ITransactionRepo } from "./repo/TransactionRepo";
import { TransactionAllowedStatus } from "./domain/TransactionAllowedStatus";
import { ConsumerLimitsDTO } from "./dto/ConsumerLimitsDTO";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";
import { ILimitProfileRepo } from "./repo/LimitProfileRepo";
import { ILimitConfigurationRepo } from "./repo/LimitConfigurationRepo";
import { TransactionType } from "./domain/Types";
import { LimitProfile, Limits } from "./domain/LimitProfile";
import { LimitConfiguration } from "./domain/LimitConfiguration";
import { PaymentMethodType } from "../consumer/domain/PaymentMethod";

@Injectable()
export class LimitsService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionsRepo: ITransactionRepo;

  @Inject("LimitProfileRepo")
  private readonly limitProfileRepo: ILimitProfileRepo;

  @Inject("LimitConfigurationRepo")
  private readonly limitConfigRepo: ILimitConfigurationRepo;

  private allLimitConfigs: LimitConfiguration[];

  private match(
    config: LimitConfiguration,
    consumer: Consumer,
    partnerID: string,
    totalTransactionAmount: number,
    transactionType?: TransactionType,
  ): boolean {
    if (config.props.criteria.partnerID && config.props.criteria.partnerID !== partnerID) {
      return config.props.isDefault;
    }
    if (
      transactionType &&
      config.props.criteria.transactionType.length > 0 &&
      !config.props.criteria.transactionType.includes(transactionType)
    ) {
      return config.props.isDefault;
    }
    if (
      config.props.criteria.minTotalTransactionAmount &&
      config.props.criteria.minTotalTransactionAmount > totalTransactionAmount
    ) {
      return config.props.isDefault;
    }
    // TODO(CRYPTO-393): Add other conditions
    return true;
  }

  async getLimits(consumer: Consumer, partnerID: string, transactionType?: TransactionType): Promise<LimitProfile> {
    if (!this.allLimitConfigs) {
      this.allLimitConfigs = await this.limitConfigRepo.getAllLimitConfigs();
    }
    const totalTransactionAmount = await this.transactionsRepo.getTotalUserTransactionAmount(consumer.props._id);
    const limitConfig: LimitConfiguration = this.allLimitConfigs.find(config =>
      this.match(config, consumer, partnerID, totalTransactionAmount, transactionType),
    );

    return await this.limitProfileRepo.getProfile(limitConfig.props.profile);
  }

  async canMakeTransaction(
    consumer: Consumer,
    transactionAmount: number,
    partnerID: string,
    transactionType?: TransactionType,
    paymentMethodType?: PaymentMethodType,
  ): Promise<CheckTransactionDTO> {
    const limitProfile = await this.getLimits(consumer, partnerID, transactionType);
    if (!paymentMethodType) paymentMethodType = PaymentMethodType.CARD;
    const limits: Limits =
      paymentMethodType === PaymentMethodType.CARD ? limitProfile.props.cardLimits : limitProfile.props.bankLimits;
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
    const totalMonthly: number = Number(transactionAmount) + Number(monthlyTransactionAmount);
    if (totalMonthly > limits.monthly) {
      // Spent + new amount exceeds monthly limit
      const maxRemaining = Math.max(limits.monthly - monthlyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limits.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

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

    const weeklyTransactionAmount = await this.transactionsRepo.getWeeklyUserTransactionAmount(consumer.props._id);

    const totalWeekly = Number(weeklyTransactionAmount) + Number(transactionAmount);

    const weeklyLimit: number = limits.weekly ? limits.weekly : limits.monthly;

    if (totalWeekly > weeklyLimit) {
      const maxRemaining = Math.max(weeklyLimit - weeklyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limits.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

      return {
        status: TransactionAllowedStatus.WEEKLY_LIMIT_REACHED,
        rangeMin: minRemaining,
        rangeMax: maxRemaining,
      };
    }

    const dailyTransactionAmount = await this.transactionsRepo.getDailyUserTransactionAmount(consumer.props._id);

    const totalDaily = Number(dailyTransactionAmount) + Number(transactionAmount);

    let dailyLimit = 0;

    if (limits.daily) dailyLimit = limits.daily;
    else if (limits.weekly) dailyLimit = limits.weekly;
    else dailyLimit = limits.monthly;

    if (totalDaily > dailyLimit) {
      const maxRemaining = Math.max(dailyLimit - dailyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limits.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

      return {
        status: TransactionAllowedStatus.DAILY_LIMIT_REACHED,
        rangeMin: minRemaining,
        rangeMax: maxRemaining,
      };
    }

    // TODO(CRYPTO-393): Add wallet exposure check
    return {
      status: TransactionAllowedStatus.ALLOWED,
      rangeMin: limits.minTransaction,
      rangeMax: limits.maxTransaction,
    };
  }

  async getConsumerLimits(
    consumer: Consumer,
    partnerID: string,
    transactionType?: TransactionType,
    paymentMethodType?: PaymentMethodType,
  ): Promise<ConsumerLimitsDTO> {
    const limitProfile = await this.getLimits(consumer, partnerID, transactionType);
    if (!paymentMethodType) paymentMethodType = PaymentMethodType.CARD;
    let limits: Limits;

    if (paymentMethodType === PaymentMethodType.CARD) {
      limits = limitProfile.props.cardLimits;
    } else {
      limits = limitProfile.props.bankLimits;
    }

    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props._id,
    );

    const limitsDTO: ConsumerLimitsDTO = {
      minTransaction: limits.minTransaction,
      maxTransaction: limits.maxTransaction,
      monthly: { max: limits.monthly, used: monthlyTransactionAmount, period: 30 },
    };

    return limitsDTO;
  }
}
