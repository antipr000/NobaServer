import { KeysRequired } from "../../../modules/common/domain/Types";
// TODO: Move configurations to database for better control

export interface Limit {
    max_amount_limit: number; // Maximum limit over a window
    max_usage_limit: number; // Maximum limit on frequency over a window
    no_kyc_max_amount_limit: number; // Maximum amount limit without kyc
    partial_kyc_max_amount_limit: number; // Maximum amount limit with id verification only
};


export const DailyLimitBuyOnly: KeysRequired<Limit> = {
    max_amount_limit: 0,
    max_usage_limit: 0,
    no_kyc_max_amount_limit: 0,
    partial_kyc_max_amount_limit: 0
}

export const WeeklyLimitBuyOnly: KeysRequired<Limit> = {
    max_amount_limit: 0,
    max_usage_limit: 0,
    no_kyc_max_amount_limit: 0,
    partial_kyc_max_amount_limit: 0
}

export const MonthlyLimitBuyOnly: KeysRequired<Limit> = {
    max_amount_limit: 0,
    max_usage_limit: 0,
    no_kyc_max_amount_limit: 0,
    partial_kyc_max_amount_limit: 0
}

export const LifetimeLimitBuyOnly: KeysRequired<Limit> = {
    max_amount_limit: 0,
    max_usage_limit: 0,
    no_kyc_max_amount_limit: 0,
    partial_kyc_max_amount_limit: 0
}

export const TransactionLimitBuyOnly: KeysRequired<Limit> = {
    max_amount_limit: 0,
    max_usage_limit: 0,
    no_kyc_max_amount_limit: 0,
    partial_kyc_max_amount_limit: 0
}