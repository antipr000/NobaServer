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
  DEPOSIT_FEE_AMOUNT,
  AWS_SECRET_KEY_FOR_DEPOSIT_FEE_AMOUNT,
  DEPOSIT_FEE_PERCENTAGE,
  AWS_SECRET_KEY_FOR_DEPOSIT_FEE_PERCENTAGE,
} from "../ConfigurationUtils";

export interface NobaConfigs {
  [AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY]: string;
  [NOBA_APP_SECRET_KEY]: string;
  [AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN]: string;
  [NOBA_PRIVATE_BEARER_TOKEN]: string;
  [NOBA_TRANSACTION_CONFIG_KEY]: NobaTransactionConfigs;
}

export interface NobaTransactionConfigs {
  [SPREAD_PERCENTAGE]: number;
  [FLAT_FEE_DOLLARS]: number;
  [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: number;
  [FIXED_CREDIT_CARD_FEE]: number;
  [SLIPPAGE_ALLOWED_PERCENTAGE]: number;
  [DEPOSIT_FEE_AMOUNT]: number;
  [DEPOSIT_FEE_PERCENTAGE]: number;

  [AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS]: string;
  [AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE]: string;
  [AWS_SECRET_KEY_FOR_SLIPPAGE_ALLOWED_PERCENTAGE]: string;
  [AWS_SECRET_KEY_FOR_DEPOSIT_FEE_AMOUNT]: string;
  [AWS_SECRET_KEY_FOR_DEPOSIT_FEE_PERCENTAGE]: string;
}
