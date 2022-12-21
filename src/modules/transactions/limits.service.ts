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
import { LimitProfile } from "./domain/LimitProfile";
import { LimitConfiguration } from "./domain/LimitConfiguration";
import { PaymentMethodType, TransactionType } from "@prisma/client";

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
    totalTransactionAmount: number,
    paymentMethodType: PaymentMethodType,
    transactionType: TransactionType,
  ): boolean {
    if (config.props.transactionType !== transactionType) {
      return (
        config.props.isDefault &&
        (!config.props.paymentMethodType || config.props.paymentMethodType === paymentMethodType)
      );
    }
    if (config.props.minTotalTransactionAmount && config.props.minTotalTransactionAmount > totalTransactionAmount) {
      return (
        config.props.isDefault &&
        (!config.props.paymentMethodType || config.props.paymentMethodType === paymentMethodType)
      );
    }
    if (config.props.minProfileAge && config.props.minProfileAge > consumer.getAccountAge()) {
      return (
        config.props.isDefault &&
        (!config.props.paymentMethodType || config.props.paymentMethodType === paymentMethodType)
      );
    }
    // TODO(CRYPTO-416): Add check for Noba Wallet Balance
    return true;
  }

  async getLimits(
    consumer: Consumer,
    transactionType?: TransactionType,
    paymentMethodType?: PaymentMethodType,
  ): Promise<LimitProfile> {
    if (!this.allLimitConfigs) {
      this.allLimitConfigs = await this.limitConfigRepo.getAllLimitConfigs();
    }
    const totalTransactionAmount = await this.transactionsRepo.getTotalUserTransactionAmount(consumer.props.id);
    const limitConfig: LimitConfiguration = this.allLimitConfigs.find(config =>
      this.match(config, consumer, totalTransactionAmount, paymentMethodType, transactionType),
    );

    return await this.limitProfileRepo.getProfile(limitConfig.props.profileID);
  }

  async canMakeTransaction(
    consumer: Consumer,
    transactionAmount: number,
    transactionType: TransactionType,
    paymentMethodType?: PaymentMethodType,
  ): Promise<CheckTransactionDTO> {
    const limitProfile = await this.getLimits(consumer, transactionType, paymentMethodType);
    // Check single transaction limit

    if (transactionAmount < limitProfile.props.minTransaction) {
      return {
        status: TransactionAllowedStatus.TRANSACTION_TOO_SMALL,
        rangeMin: limitProfile.props.minTransaction,
        rangeMax: limitProfile.props.maxTransaction,
      };
    }

    if (transactionAmount > limitProfile.props.maxTransaction) {
      return {
        status: TransactionAllowedStatus.TRANSACTION_TOO_LARGE,
        rangeMin: limitProfile.props.minTransaction,
        rangeMax: limitProfile.props.maxTransaction,
      };
    }

    /* Removed checks for daily, weekly, and total for now. It's easy enough to bring them back if we need them.
    If we do bring them back, let's check each one after we retrieve the total so we don't execute more queries than necessary. */

    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props.id,
    );

    // For some reason without casting the operands to a Number, this ends up doing string concat
    const totalMonthly: number = Number(transactionAmount) + Number(monthlyTransactionAmount);
    if (totalMonthly > limitProfile.props.monthly) {
      // Spent + new amount exceeds monthly limit
      const maxRemaining = Math.max(limitProfile.props.monthly - monthlyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limitProfile.props.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

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

    const weeklyTransactionAmount = await this.transactionsRepo.getWeeklyUserTransactionAmount(consumer.props.id);

    const totalWeekly = Number(weeklyTransactionAmount) + Number(transactionAmount);

    const weeklyLimit: number = limitProfile.props.weekly ?? limitProfile.props.monthly;

    if (totalWeekly > weeklyLimit) {
      const maxRemaining = Math.max(weeklyLimit - weeklyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limitProfile.props.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

      return {
        status: TransactionAllowedStatus.WEEKLY_LIMIT_REACHED,
        rangeMin: minRemaining,
        rangeMax: maxRemaining,
      };
    }

    const dailyTransactionAmount = await this.transactionsRepo.getDailyUserTransactionAmount(consumer.props.id);

    const totalDaily = Number(dailyTransactionAmount) + Number(transactionAmount);

    let dailyLimit = 0;

    if (limitProfile.props.daily) dailyLimit = limitProfile.props.daily;
    else if (limitProfile.props.weekly) dailyLimit = limitProfile.props.weekly;
    else dailyLimit = limitProfile.props.monthly;

    if (totalDaily > dailyLimit) {
      const maxRemaining = Math.max(dailyLimit - dailyTransactionAmount, 0); // We have our full limit minus what we've spent so far this month remaining
      const minRemaining = limitProfile.props.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

      return {
        status: TransactionAllowedStatus.DAILY_LIMIT_REACHED,
        rangeMin: minRemaining,
        rangeMax: maxRemaining,
      };
    }

    // Check for unsettled exposure limit
    if (paymentMethodType === PaymentMethodType.ACH && limitProfile.props.unsettledExposure) {
      // TODO: Fix this
      // const achPaymentMethodIds = consumer.props.paymentMethods
      //   .filter(pMethod => pMethod.type === PaymentMethodType.ACH)
      //   .map(pMethod => pMethod.paymentToken);
      const achPaymentMethodIds = [];

      const totalUnsettledACHPaymentAmount = await this.transactionsRepo.getUserACHUnsettledTransactionAmount(
        consumer.props.id,
        achPaymentMethodIds,
      );

      if (limitProfile.props.unsettledExposure < Number(totalUnsettledACHPaymentAmount) + Number(transactionAmount)) {
        const maxRemaining = Math.max(limitProfile.props.unsettledExposure - totalUnsettledACHPaymentAmount, 0);
        const minRemaining = limitProfile.props.minTransaction; // Default the minimum at the min transaction limit. This will always be the case.

        return {
          status: TransactionAllowedStatus.UNSETTLED_EXPOSURE_LIMIT_REACHED,
          rangeMax: maxRemaining,
          rangeMin: minRemaining,
        };
      }
    }

    // TODO(CRYPTO-393): Add wallet exposure check
    return {
      status: TransactionAllowedStatus.ALLOWED,
      rangeMin: limitProfile.props.minTransaction,
      rangeMax: limitProfile.props.maxTransaction,
    };
  }

  async getConsumerLimits(
    consumer: Consumer,
    transactionType: TransactionType,
    paymentMethodType?: PaymentMethodType,
  ): Promise<ConsumerLimitsDTO> {
    const limitProfile = await this.getLimits(consumer, transactionType, paymentMethodType);

    const monthlyTransactionAmount: number = await this.transactionsRepo.getMonthlyUserTransactionAmount(
      consumer.props.id,
    );

    const limitsDTO: ConsumerLimitsDTO = {
      minTransaction: limitProfile.props.minTransaction,
      maxTransaction: limitProfile.props.maxTransaction,
      monthly: { max: limitProfile.props.monthly, used: monthlyTransactionAmount, period: 30 },
    };

    return limitsDTO;
  }
}
