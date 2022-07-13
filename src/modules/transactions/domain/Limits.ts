import { KeysRequired } from "../../../modules/common/domain/Types";
// TODO: Move configurations to database for better control

export interface UserLimits {
  dailyLimit: number;
  monthlyLimit: number;
  weeklyLimit: number;
  transactionLimit: number;
  totalLimit: number;
  minTransaction: number;
  maxTransaction: number;
}

export interface Limit {
  max_amount_limit: number; // Maximum limit over a window
  max_usage_limit: number; // Maximum limit on frequency over a window
  no_kyc_max_amount_limit: number; // Maximum amount limit without kyc
  partial_kyc_max_amount_limit: number; // Maximum amount limit with id verification only
}

export const TransactionLimit = {
  min_transaction: 50,
  max_transaction: 500,
};

export const DailyLimitBuyOnly: KeysRequired<Limit> = {
  max_amount_limit: 100,
  max_usage_limit: 0,
  no_kyc_max_amount_limit: 20,
  partial_kyc_max_amount_limit: 100,
};

export const WeeklyLimitBuyOnly: KeysRequired<Limit> = {
  max_amount_limit: 500,
  max_usage_limit: 0,
  no_kyc_max_amount_limit: 100,
  partial_kyc_max_amount_limit: 200,
};

export const MonthlyLimitBuyOnly: KeysRequired<Limit> = {
  max_amount_limit: 2000,
  max_usage_limit: 0,
  no_kyc_max_amount_limit: 2000,
  partial_kyc_max_amount_limit: 2000,
};

export const LifetimeLimitBuyOnly: KeysRequired<Limit> = {
  max_amount_limit: 10000,
  max_usage_limit: 0,
  no_kyc_max_amount_limit: 5000,
  partial_kyc_max_amount_limit: 7000,
};

export const TransactionLimitBuyOnly: KeysRequired<Limit> = {
  max_amount_limit: 100,
  max_usage_limit: 0,
  no_kyc_max_amount_limit: 20,
  partial_kyc_max_amount_limit: 100,
};
