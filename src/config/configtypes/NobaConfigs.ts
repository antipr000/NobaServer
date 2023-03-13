import {
  AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE,
  AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE,
  AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS,
  AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE,
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  NOBA_TRANSACTION_CONFIG_KEY,
  SPREAD_PERCENTAGE,
  SLIPPAGE_ALLOWED_PERCENTAGE,
  AWS_SECRET_KEY_FOR_SLIPPAGE_ALLOWED_PERCENTAGE,
  NOBA_APP_SECRET_KEY,
  AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY,
  AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN,
  NOBA_PRIVATE_BEARER_TOKEN,
  DEPOSIT_FEE_FIXED_AMOUNT,
  AWS_SECRET_KEY_FOR_DEPOSIT_FEE_FIXED_AMOUNT,
  DEPOSIT_NOBA_FEE_AMOUNT,
  AWS_SECRET_KEY_FOR_DEPOSIT_NOBA_FEE_AMOUNT,
  DEPOSIT_FEE_MULTIPLIER,
  AWS_SECRET_KEY_FOR_DEPOSIT_FEE_MULTIPLIER,
  NOBA_BUBBLE_BEARER_TOKEN,
  AWS_SECRET_KEY_FOR_NOBA_BUBBLE_BEARER_TOKEN,
  COLLECTION_FEE_FIXED_AMOUNT,
  COLLECTION_FEE_MULTIPLIER,
  AWS_SECRET_KEY_FOR_COLLECTION_FEE_FIXED_AMOUNT,
  AWS_SECRET_KEY_FOR_COLLECTION_FEE_MULTIPLIER,
  COLLECTION_NOBA_FEE_AMOUNT,
  AWS_SECRET_KEY_FOR_COLLECTION_NOBA_FEE_AMOUNT,
  WITHDRAWAL_MONO_FEE_AMOUNT,
  WITHDRAWAL_NOBA_FEE_AMOUNT,
  AWS_SECRET_KEY_FOR_WITHDRAWAL_MONO_FEE_AMOUNT,
  AWS_SECRET_KEY_FOR_WITHDRAWAL_NOBA_FEE_AMOUNT,
  NOBA_ADMIN_BEARER_TOKEN,
  AWS_SECRET_KEY_FOR_NOBA_ADMIN_BEARER_TOKEN,
  NOBA_PAYROLL_ACCOUNT_NUMBER,
  NOBA_PAYROLL_AWS_SECRET_KEY_FOR_NOBA_PAYROLL_ACCOUNT_NUMBER,
  NOBA_PAYROLL_CONFIG_KEY,
  AppEnvironment,
} from "../ConfigurationUtils";

export interface NobaConfigs {
  environment: AppEnvironment;
  [AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY]: string;
  [NOBA_APP_SECRET_KEY]: string;
  [NOBA_ADMIN_BEARER_TOKEN]: string;
  [AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN]: string;
  [NOBA_PRIVATE_BEARER_TOKEN]: string;
  [NOBA_BUBBLE_BEARER_TOKEN]: string;
  [AWS_SECRET_KEY_FOR_NOBA_BUBBLE_BEARER_TOKEN]: string;
  [AWS_SECRET_KEY_FOR_NOBA_ADMIN_BEARER_TOKEN]: string;
  [NOBA_TRANSACTION_CONFIG_KEY]: NobaTransactionConfigs;
  [NOBA_PAYROLL_CONFIG_KEY]: NobaPayrollConfigs;
}

export interface NobaTransactionConfigs {
  [SPREAD_PERCENTAGE]: number;
  [FLAT_FEE_DOLLARS]: number;
  [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: number;
  [FIXED_CREDIT_CARD_FEE]: number;
  [SLIPPAGE_ALLOWED_PERCENTAGE]: number;
  [DEPOSIT_FEE_FIXED_AMOUNT]: number;
  [DEPOSIT_FEE_MULTIPLIER]: number;
  [DEPOSIT_NOBA_FEE_AMOUNT]: number;
  [COLLECTION_FEE_FIXED_AMOUNT]: number;
  [COLLECTION_FEE_MULTIPLIER]: number;
  [COLLECTION_NOBA_FEE_AMOUNT]: number;
  [WITHDRAWAL_MONO_FEE_AMOUNT]: number;
  [WITHDRAWAL_NOBA_FEE_AMOUNT]: number;

  [AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS]: string;
  [AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE]: string;
  [AWS_SECRET_KEY_FOR_SLIPPAGE_ALLOWED_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_DEPOSIT_FEE_FIXED_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_DEPOSIT_FEE_MULTIPLIER]: string;
  [AWS_SECRET_KEY_FOR_DEPOSIT_NOBA_FEE_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_COLLECTION_FEE_FIXED_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_COLLECTION_FEE_MULTIPLIER]: string;
  [AWS_SECRET_KEY_FOR_COLLECTION_NOBA_FEE_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_WITHDRAWAL_MONO_FEE_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_WITHDRAWAL_NOBA_FEE_AMOUNT]: string;
}

export interface NobaPayrollConfigs {
  [NOBA_PAYROLL_ACCOUNT_NUMBER]: string;
  [NOBA_PAYROLL_AWS_SECRET_KEY_FOR_NOBA_PAYROLL_ACCOUNT_NUMBER]: string;
}
