import { Prisma } from "@prisma/client";
import { LimitProfile } from "../domain/LimitProfile";
import { LimitConfiguration } from "../domain/LimitConfiguration";

export class LimitsRepoMapper {
  toCreateLimitProfileInput(limitProfile: LimitProfile): Prisma.LimitProfileCreateInput {
    return {
      id: limitProfile.props.id,
      name: limitProfile.props.name,
      monthly: limitProfile.props.monthly,
      minTransaction: limitProfile.props.minTransaction,
      maxTransaction: limitProfile.props.maxTransaction,
      ...(limitProfile.props.daily && { daily: limitProfile.props.daily }),
      ...(limitProfile.props.weekly && { weekly: limitProfile.props.weekly }),
      ...(limitProfile.props.unsettledExposure && { unsettledExposure: limitProfile.props.unsettledExposure }),
    };
  }

  toCreateLimitConfiguration(limitConfig: LimitConfiguration): Prisma.LimitConfigurationCreateInput {
    return {
      id: limitConfig.props.id,
      priority: limitConfig.props.priority,
      isDefault: limitConfig.props.isDefault ?? false,
      ...(limitConfig.props.transactionType && { transactionType: limitConfig.props.transactionType }),
      ...(limitConfig.props.minProfileAge && { minProfileAge: limitConfig.props.minProfileAge }),
      ...(limitConfig.props.minBalanceInWallet && { minBalanceInWallet: limitConfig.props.minBalanceInWallet }),
      ...(limitConfig.props.minTotalTransactionAmount && {
        minTotalTransactionAmount: limitConfig.props.minTotalTransactionAmount,
      }),
      ...(limitConfig.props.paymentMethodType && { paymentMethodType: limitConfig.props.paymentMethodType }),
      profile: {
        connect: {
          id: limitConfig.props.profileID,
        },
      },
    };
  }
}
