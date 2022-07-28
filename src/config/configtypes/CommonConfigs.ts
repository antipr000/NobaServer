import {
  COMMON_CONFIG_KEY,
  COMMON_CONFIG_CRYPTO_IMAGE_BASE_URL,
  COMMON_CONFIG_FIAT_IMAGE_BASE_URL,
  COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY,
  COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY,
} from "../ConfigurationUtils";

export interface CommonConfigs {
  [COMMON_CONFIG_KEY]: string;
  [COMMON_CONFIG_CRYPTO_IMAGE_BASE_URL]: string;
  [COMMON_CONFIG_FIAT_IMAGE_BASE_URL]: string;
  [COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY]: number;
  [COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY]: number;
}