import * as Joi from "joi";
import { SecretProvider } from "./SecretProvider";

export enum AppEnvironment {
  DEV = "development",
  SANDBOX = "sandbox",
  PARTNER = "partner",
  PROD = "production",
  STAGING = "staging",
  E2E_TEST = "e2e_test",
  AWSDEV = "awsdev",
}

export const NODE_ENV_CONFIG_KEY = "NODE_ENV";
export const REDIS_CONFIG_CONFIG_KEY = "redis";
export const SES_CONFIG_KEY = "ses";
export const S3_CONFIG_KEY = "s3";
export const MASTER_CONFIG_DIRECTORY = "masterConfigDirectory"; // Set programmatically in AppConfiguration, not from config file

export const SERVER_LOG_FILE_PATH = "logFilePath";

// It is assumed that the every dependent files are present in 'appconfigs/' folder itself.
export const SUPPORTED_CRYPTO_TOKENS_FILE_NAME = "supportedCryptoFileName";
export const SUPPORTED_CRYPTO_TOKENS_FILE_PATH = "SUPPORTED_CRYPTO_TOKENS_FILE_PATH";
export const LOCATION_DATA_FILE_NAME = "locationDataFileName";
export const LOCATION_DATA_FILE_PATH = "LOCATION_DATA_FILE_PATH";
export const CCBIN_DATA_FILE_NAME_MASK = "ccBINDataFileNameMask";
export const CCBIN_DATA_FILE_PATH = "CCBIN_DATA_FILE_PATH";

export const AWS_ACCESS_KEY_ID_ATTR = "awsAccessKeyId";
export const AWS_SECRET_ACCESS_KEY_ATTR = "awsSecretAccessKey";
export const AWS_DEFAULT_REGION_ATTR = "awsDefaultRegion";
export const AWS_ACCOUNT_ID_ATTR = "awsAccountID";
export const AWS_REGION_ATTR = "awsRegion";
export const AWS_ACCESS_KEY_ID_ENV_VARIABLE = "AWS_ACCESS_KEY_ID";
export const AWS_SECRET_ACCESS_KEY_ENV_VARIABLE = "AWS_SECRET_ACCESS_KEY";
export const AWS_REGION_ENV_VARIABLE = "AWS_REGION";
export const AWS_DEFAULT_REGION_ENV_VARIABLE = "AWS_DEFAULT_REGION";

export const STRIPE_CONFIG_KEY = "stripe";
export const STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR = "awsSecretNameForSecretKey";
export const STRIPE_SECRET_KEY = "secretKey";

export const CHECKOUT_CONFIG_KEY = "checkout";
export const CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_PUBLIC_KEY = "awsSecretNameForPublicKey";
export const CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_SECRET_KEY = "awsSecretNameForSecretKey";
export const CHECKOUT_PUBLIC_KEY = "publicKey";
export const CHECKOUT_SECRET_KEY = "secretKey";

export const TWILIO_CONFIG_KEY = "twilio";
export const TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR = "awsSecretNameForSID";
export const TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR = "awsSecretNameForAuthToken";
export const TWILIO_SID = "SID";
export const TWILIO_AUTH_TOKEN = "authToken";
export const TWILIO_FROM_PHONE_NUMBER = "fromPhoneNumber";

export const SENDGRID_CONFIG_KEY = "sendgrid";
export const SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameForApiKey";
export const SENDGRID_API_KEY = "apiKey";

export const MONGO_CONFIG_KEY = "mongo";
export const MONGO_AWS_SECRET_KEY_FOR_URI_ATTR = "awsSecretNameForUri";
export const MONGO_URI = "uri";
export const MONGO_URI_ENV_KEY = "MONGO_URI";

export const SARDINE_CONFIG_KEY = "sardine";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR = "awsSecretNameForSardineClientID";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR = "awsSecretNameForSardineSecretKey";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_WEBHOOK_SECRET_KEY_ATTR = "awsSecretNameForSardineWebhookSecretKey";
export const SARDINE_CLIENT_ID = "clientID";
export const SARDINE_SECRET_KEY = "secretKey";
export const SARDINE_WEBHOOK_SECRET_KEY = "webhookSecretKey";
export const SARDINE_URI = "sardineBaseUri";

export const NOBA_CONFIG_KEY = "noba";
export const NOBA_PARTNER_ID = "partnerID";

export const NOBA_TRANSACTION_CONFIG_KEY = "transaction";
export const SPREAD_PERCENTAGE = "spreadPercentage";
export const FLAT_FEE_DOLLARS = "flatFeeDollars";
export const DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE = "dynamicCreditCardFeePercentage";
export const FIXED_CREDIT_CARD_FEE = "fixedCreditCardFee";
export const SLIPPAGE_ALLOWED_PERCENTAGE = "slippageAllowedPercentage";
export const AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE = "awsSecretKeyForSpreadPercentage";
export const AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS = "awsSecretKeyForFlatFeeDollars";
export const AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE = "awsSecretKeyForDynamicCreditCardFeePercentage";
export const AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE = "awsSecretKeyForFixedCreditCardFee";
export const AWS_SECRET_KEY_FOR_SLIPPAGE_ALLOWED_PERCENTAGE = "awsSecretKeyForSlippageAllowedPercentage";

export const ZEROHASH_CONFIG_KEY = "zerohash";
export const ZEROHASH_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameforApiKey";
export const ZEROHASH_AWS_SECRET_KEY_FOR_API_SECRET_ATTR = "awsSecretNameForApiSecret";
export const ZEROHASH_AWS_SECRET_KEY_FOR_PASS_PHRASE_ATTR = "awsSecretNameForPassPhrase";
export const ZEROHASH_AWS_SECRET_KEY_FOR_HOST_ATTR = "awsSecretNameForHost";
export const ZEROHASH_AWS_SECRET_KEY_FOR_PLATFORM_CODE = "awsSecretNameForPlatformCode";
export const ZEROHASH_API_KEY = "apiKey";
export const ZEROHASH_API_SECRET = "apiSecret";
export const ZEROHASH_PASS_PHRASE = "passPhrase";
export const ZEROHASH_HOST = "host";
export const ZEROHASH_PLATFORM_CODE = "platformCode";

export const KMS_CONFIG_CONTEXT_KEY = "context";
export const KMS_CONFIG_KEY = "kms";
export const KMS_CONTEXT_STAGE = "stage";
export const KMS_CONTEXT_PURPOSE = "purpose";
export const KMS_CONTEXT_ORIGIN = "origin";
export const KMS_SSN_CONFIG_KEY = "ssn";
export const GENERATOR_KEY_KMS_ARN = "generatorKeyArn";
export const FOLLOW_UP_KEY_KMS_ARN = "followUpKeyArn";
export const AWS_SECRET_KEY_FOR_GENERATOR_KEY_KMS_ARN = "awsSecretNameForGeneratorKeyArn";
export const AWS_SECRET_KEY_FOR_FOLLOW_UP_KEY_KMS_ARN = "awsSecretNameForFollowUpKeyArn";

export const COMMON_CONFIG_KEY = "configuration";
export const COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY = "lowAmountThreshold";
export const COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY = "highAmountThreshold";
export const COMMON_CONFIG_CRYPTO_IMAGE_BASE_URL = "cryptoImageBaseUrl";
export const COMMON_CONFIG_FIAT_IMAGE_BASE_URL = "fiatImageBaseUrl";

export const appConfigsJoiValidationSchema = Joi.object({
  [AWS_REGION_ATTR]: Joi.string().required(),
  [AWS_DEFAULT_REGION_ATTR]: Joi.string().required(),
  [NODE_ENV_CONFIG_KEY]: Joi.string().default(AppEnvironment.DEV),
  logFilePath: Joi.string().required(),
}).options({ allowUnknown: true });

export function getEnvironmentName(): AppEnvironment {
  const envType: any = getPropertyFromEnvironment(NODE_ENV_CONFIG_KEY);
  if (!envType) throw new Error("Expect NODE_ENV environment variable to be present in the environment");
  if (!Object.values(AppEnvironment).includes(envType)) {
    throw new Error("NODE_ENV should be one of " + Object.values(AppEnvironment).join(","));
  }
  return envType as AppEnvironment;
}

export function isLocalDevEnvironment(): boolean {
  return getEnvironmentName() == AppEnvironment.DEV;
}

export function getPropertyFromEnvironment(key: string) {
  return process.env[key];
}

export function isPropertyPresentInEnvironmentVariables(key: string): boolean {
  const value = getPropertyFromEnvironment(key);
  if (value === "" || value === undefined || value === null) return false;
  return true;
}

export function resetPropertyFromEnvironment(key: string): void {
  delete process.env[key];
}

export function setEnvironmentProperty(key: string, value: string): void {
  process.env[key] = value;
}

export async function getParameterValue(awsSecretKey: string, customValue: string): Promise<string> {
  if (awsSecretKey === undefined || awsSecretKey === "") {
    if (customValue === undefined || customValue === "") {
      throw Error(`Neither ${awsSecretKey} nor ${customValue} is set.`);
    }
    return customValue;
  }
  return SecretProvider.fetchSecretFromAWSSecretManager(awsSecretKey);
}
