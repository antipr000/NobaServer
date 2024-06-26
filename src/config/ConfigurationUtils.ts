import Joi from "joi";
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
export const LOCATION_DATA_FILE_NAME = "locationDataFileName";
export const LOCATION_DATA_FILE_PATH = "LOCATION_DATA_FILE_PATH";
export const IDENTIFICATION_TYPES_FILE_NAME = "identificationTypesFileName";
export const IDENTIFICATION_TYPES_FILE_PATH = "IDENTIFICATION_TYPES_FILE_PATH";
export const ASSETS_BUCKET_NAME = "assetsBucketName";
export const GENERATED_DATA_BUCKET_NAME = "generatedDataBucketName";
export const DB_DUMP_FILES_BUCKET_PATH = "dbDumpFilesBucketPath";
export const SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH = "supportedCryptoFileBucketPath";
export const SANCTIONED_CRYPTO_WALLETS_FILE_BUCKET_PATH = "sanctionedCryptoWalletsFileBucketPath";
export const TEMPLATES_FOLDER_BUCKET_PATH = "templatesFolderBucketPath";
export const INVOICES_FOLDER_BUCKET_PATH = "invoicesFolderBucketPath";
export const QR_CODES_FOLDER_BUCKET_PATH = "qrCodesFolderBucketPath";
export const QR_CODES_BASE_URL = "qrCodesBaseUrl";
export const INVITE_CSV_FOLDER_BUCKET_PATH = "invitesCsvFolderBucketPath";
export const STATIC_DEV_OTP = "staticDevOTP";

export const AWS_ACCESS_KEY_ID_ATTR = "awsAccessKeyId";
export const AWS_SECRET_ACCESS_KEY_ATTR = "awsSecretAccessKey";
export const AWS_MASTER_SECRET = "awsMasterSecret";
export const AWS_DEFAULT_REGION_ATTR = "awsDefaultRegion";
export const AWS_ACCOUNT_ID_ATTR = "awsAccountID";
export const AWS_REGION_ATTR = "awsRegion";
export const AWS_ACCESS_KEY_ID_ENV_VARIABLE = "AWS_ACCESS_KEY_ID";
export const AWS_SECRET_ACCESS_KEY_ENV_VARIABLE = "AWS_SECRET_ACCESS_KEY";
export const AWS_REGION_ENV_VARIABLE = "AWS_REGION";
export const AWS_DEFAULT_REGION_ENV_VARIABLE = "AWS_DEFAULT_REGION";

export const CHECKOUT_CONFIG_KEY = "checkout";
export const CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_PUBLIC_KEY = "awsSecretNameForPublicKey";
export const CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_SECRET_KEY = "awsSecretNameForSecretKey";
export const CHECKOUT_PUBLIC_KEY = "publicKey";
export const CHECKOUT_SECRET_KEY = "secretKey";
export const CHECKOUT_COUPON_CODE = "couponCode";
export const CHECKOUT_PARTNER_ID = "partnerId";
export const CHECKOUT_PROCESSING_CHANNEL_ID = "processingChannelId";
export const CHECKOUT_WEBHOOK_SIGNATURE_KEY = "webhookSignatureKey";
export const CHECKOUT_AWS_SECRET_NAME_FOR_WEBHOOK_SIGNATURE_KEY = "awsSecretNameForWebhookSignatureKey";
export const CHECKOUT_API_URL = "apiUrl";
export const CHECKOUT_NOBA_WEBHOOK_URL = "nobaWebhookUrl";

export const TWILIO_CONFIG_KEY = "twilio";
export const TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR = "awsSecretNameForSID";
export const TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR = "awsSecretNameForAuthToken";
export const TWILIO_SID = "SID";
export const TWILIO_AUTH_TOKEN = "authToken";
export const TWILIO_FROM_PHONE_NUMBER = "fromPhoneNumber";

export const SENDGRID_CONFIG_KEY = "sendgrid";
export const SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameForApiKey";
export const SENDGRID_API_KEY = "apiKey";
export const SENDGRID_SUPPRESS_EMAILS_REGEX = "suppressEmailsRegex";

export const SARDINE_CONFIG_KEY = "sardine";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR = "awsSecretNameForSardineClientID";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR = "awsSecretNameForSardineSecretKey";
export const SARDINE_AWS_SECRET_KEY_FOR_SARDINE_WEBHOOK_SECRET_KEY_ATTR = "awsSecretNameForSardineWebhookSecretKey";
export const SARDINE_CLIENT_ID = "clientID";
export const SARDINE_SECRET_KEY = "secretKey";
export const SARDINE_WEBHOOK_SECRET_KEY = "webhookSecretKey";
export const SARDINE_URI = "sardineBaseUri";

export const NOBA_CONFIG_KEY = "noba";
export const NOBA_APP_SECRET_KEY = "appSecretKey";
export const NOBA_PRIVATE_BEARER_TOKEN = "privateBearerToken";
export const NOBA_ADMIN_BEARER_TOKEN = "adminBearerToken";
export const NOBA_BUBBLE_BEARER_TOKEN = "bubbleBearerToken";
export const AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN = "awsSecretKeyForPrivateBearerToken";
export const AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY = "awsSecretKeyForAppSecretKey";
export const AWS_SECRET_KEY_FOR_NOBA_BUBBLE_BEARER_TOKEN = "awsSecretKeyForBubbleBearerToken";
export const AWS_SECRET_KEY_FOR_NOBA_ADMIN_BEARER_TOKEN = "awsSecretKeyForAdminBearerToken";
export const NOBA_PROXY_IP = "proxyIP";
export const NOBA_PROXY_PORT = "proxyPort";

export const NOBA_TRANSACTION_CONFIG_KEY = "transaction";
export const SPREAD_PERCENTAGE = "spreadPercentage";
export const FLAT_FEE_DOLLARS = "flatFeeDollars";
export const DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE = "dynamicCreditCardFeePercentage";
export const FIXED_CREDIT_CARD_FEE = "fixedCreditCardFee";
export const SLIPPAGE_ALLOWED_PERCENTAGE = "slippageAllowedPercentage";
export const DEPOSIT_FEE_FIXED_AMOUNT = "depositFeeFixedAmount";
export const DEPOSIT_FEE_MULTIPLIER = "depositFeeMultiplier";
export const DEPOSIT_NOBA_FEE_AMOUNT = "depositNobaFeeAmount";
export const COLLECTION_FEE_FIXED_AMOUNT = "collectionFeeFixedAmount";
export const COLLECTION_FEE_MULTIPLIER = "collectionFeeMultiplier";
export const COLLECTION_NOBA_FEE_AMOUNT = "collectionNobaFeeAmount";
export const WITHDRAWAL_MONO_FEE_AMOUNT = "withdrawalMonoFeeAmount";
export const WITHDRAWAL_NOBA_FEE_AMOUNT = "withdrawalNobaFeeAmount";
export const AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE = "awsSecretKeyForSpreadPercentage";
export const AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS = "awsSecretKeyForFlatFeeDollars";
export const AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE = "awsSecretKeyForDynamicCreditCardFeePercentage";
export const AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE = "awsSecretKeyForFixedCreditCardFee";
export const AWS_SECRET_KEY_FOR_SLIPPAGE_ALLOWED_PERCENTAGE = "awsSecretKeyForSlippageAllowedPercentage";
export const AWS_SECRET_KEY_FOR_DEPOSIT_FEE_FIXED_AMOUNT = "awsSecretKeyForDepositFeeFixedAmount";
export const AWS_SECRET_KEY_FOR_DEPOSIT_FEE_MULTIPLIER = "awsSecretKeyForDepositFeeMultiplier";
export const AWS_SECRET_KEY_FOR_DEPOSIT_NOBA_FEE_AMOUNT = "awsSecretKeyForDepositNobaFeeAmount";
export const AWS_SECRET_KEY_FOR_COLLECTION_FEE_FIXED_AMOUNT = "awsSecretKeyForCollectionFeeFixedAmount";
export const AWS_SECRET_KEY_FOR_COLLECTION_FEE_MULTIPLIER = "awsSecretKeyForCollectionFeeMultiplier";
export const AWS_SECRET_KEY_FOR_COLLECTION_NOBA_FEE_AMOUNT = "awsSecretKeyForCollectionNobaFeeAmount";
export const AWS_SECRET_KEY_FOR_WITHDRAWAL_MONO_FEE_AMOUNT = "awsSecretKeyForWithdrawalMonoFeeAmount";
export const AWS_SECRET_KEY_FOR_WITHDRAWAL_NOBA_FEE_AMOUNT = "awsSecretKeyForWithdrawalNobaFeeAmount";

export const ZEROHASH_CONFIG_KEY = "zerohash";
export const ZEROHASH_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameForApiKey";
export const ZEROHASH_AWS_SECRET_KEY_FOR_API_SECRET_ATTR = "awsSecretNameForApiSecret";
export const ZEROHASH_AWS_SECRET_KEY_FOR_PASS_PHRASE_ATTR = "awsSecretNameForPassPhrase";
export const ZEROHASH_AWS_SECRET_KEY_FOR_HOST_ATTR = "awsSecretNameForHost";
export const ZEROHASH_AWS_SECRET_KEY_FOR_PLATFORM_CODE = "awsSecretNameForPlatformCode";
export const ZEROHASH_API_KEY = "apiKey";
export const ZEROHASH_API_SECRET = "apiSecret";
export const ZEROHASH_PASS_PHRASE = "passPhrase";
export const ZEROHASH_HOST = "host";
export const ZEROHASH_PLATFORM_CODE = "platformCode";
export const ZEROHASH_PROXY_SERVER_IP = "proxyServerIP";
export const ZEROHASH_PROXY_SERVER_PORT = "proxyServerPort";

export const ELLIPTIC_CONFIG_KEY = "elliptic";
export const ELLIPTIC_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameForApiKey";
export const ELLIPTIC_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR = "awsSecretNameForSecretKey";
export const ELLIPTIC_API_KEY = "apiKey";
export const ELLIPTIC_SECRET_KEY = "secretKey";
export const ELLIPTIC_BASE_URL = "baseUrl";

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

export const PLAID_CONFIG_KEY = "plaid";
export const PLAID_ENVIRONMENT = "env";
export const PLAID_VERSION = "version";
export const PLAID_REDIRECT_URI = "redirectUri";
export const PLAID_CLIENT_ID = "clientID";
export const PLAID_SECRET_KEY = "secretKey";
export const PLAID_AWS_SECRET_KEY_FOR_REDIRECT_URI = "awsSecretNameForRedirectUri";
export const PLAID_AWS_SECRET_KEY_FOR_SECRET_KEY = "awsSecretNameForSecretKey";
export const PLAID_AWS_SECRET_KEY_FOR_CLIENT_ID = "awsSecretNameForClientID";

export const DEPENDENCY_CONFIG_KEY = "dependencies";
export const DEPENDENCY_EMAIL_CLIENT = "emailClient";
export const DEPENDENCY_SMS_CLIENT = "smsClient";
export const DEPENDENCY_DASHBOARD_CLIENT = "dashboardClient";
export const DEPENDENCY_PUSH_CLIENT = "pushClient";

export const CIRCLE_CONFIG_KEY = "circle";
export const CIRCLE_ENVIRONMENT = "env";
export const CIRCLE_API_KEY = "apiKey";
export const CIRCLE_AWS_SECRET_KEY_FOR_API_KEY = "awsSecretNameForApiKey";
export const CIRCLE_MASTER_WALLET_ID = "masterWalletID";
export const CIRCLE_AWS_SECRET_KEY_FOR_MASTER_WALLET_ID = "awsSecretNameForMasterWalletID";

export const POMELO_CONFIG_KEY = "pomelo";
export const POMELO_CLIENT_ID = "clientID";
export const POMELO_CLIENT_SECRET = "clientSecret";
export const POMELO_AWS_SECRET_KEY_FOR_CLIENT_ID = "awsSecretNameForClientID";
export const POMELO_AWS_SECRET_KEY_FOR_CLIENT_SECRET = "awsSecretNameForClientSecret";
export const POMELO_AFFINITY_GROUP = "affinityGroup";
export const POMELO_AWS_SECRET_KEY_FOR_AFFINITY_GROUP = "awsSecretNameForAffinityGroup";
export const POMELO_AUTH_BASE_URL = "authBaseUrl";
export const POMELO_AUDIENCE = "audience";
export const POMELO_API_BASE_URL = "apiBaseUrl";

export const EXCHANGERATEIO_CONFIG_KEY = "exchangerateio";
export const EXCHANGERATEIO_API_KEY = "apiKey";
export const EXCHANGERATEIO_AWS_SECRET_KEY_FOR_API_KEY = "awsSecretNameForApiKey";
export const EXCHANGERATEIO_BASE_URL = "baseURL";

export const NOBA_WORKFLOW_CONFIG_KEY = "nobaWorkflow";
export const NOBA_WORKFLOW_TASK_QUEUE = "taskQueue";
export const NOBA_WORKFLOW_CLIENT_URL = "clientUrl";
export const NOBA_WORKFLOW_CONNECTION_TIMEOUT_IN_MILLIS = "connectionTimeoutInMs";
export const NOBA_WORKFLOW_NAMESPACE = "namespace";
export const NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_TASK_QUEUE = "awsSecretNameForTaskQueue";
export const NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_CLIENT_URL = "awsSecretNameForClientUrl";
export const NOBA_WORKFLOW_TEMPORAL_CLOUD_CERTIFICATE = "temporalCloudCertificate";
export const NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_TEMPORAL_CLOUD_CERTIFICATE = "awsSecretForTemporalCloudCertificate";
export const NOBA_WORKFLOW_TEMPORAL_CLOUD_PRIVATE_KEY = "temporalCloudPrivateKey";
export const NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_TEMPORAL_CLOUD_PRIVATE_KEY = "awsSecretForTemporalCloudPrivateKey";

export const NOBA_PAYROLL_CONFIG_KEY = "payroll";
export const NOBA_PAYROLL_ACCOUNT_NUMBER = "nobaPayrollAccountNumber";
export const NOBA_PAYROLL_AWS_SECRET_KEY_FOR_NOBA_PAYROLL_ACCOUNT_NUMBER = "awsSecretNameForNobaPayrollAccountNumber";

export const MONO_CONFIG_KEY = "mono";
export const MONO_BEARER_TOKEN = "bearerToken";
export const MONO_AWS_SECRET_KEY_FOR_BEARER_TOKEN = "awsSecretNameForBearerToken";
export const MONO_BASE_URL = "baseURL";
export const MONO_AWS_SECRET_KEY_FOR_BASE_URL = "awsSecretNameForBaseURL";
export const MONO_NOBA_ACCOUNT_ID = "nobaAccountID";
export const MONO_AWS_SECRET_KEY_FOR_NOBA_ACCOUNT_ID = "awsSecretNameForNobaAccountID";
export const MONO_WEBHOOK_SECRET = "webhookSecret";
export const MONO_AWS_SECRET_KEY_FOR_WEBHOOK_SECRET = "awsSecretNameForWebhookSecret";

export const BUBBLE_CONFIG_KEY = "bubble";
export const BUBBLE_BEARER_TOKEN = "bearerToken";
export const BUBBLE_AWS_SECRET_KEY_FOR_BEARER_TOKEN = "awsSecretNameForBearerToken";
export const BUBBLE_BASE_URL = "baseURL";
export const BUBBLE_AWS_SECRET_KEY_FOR_BASE_URL = "awsSecretNameForBaseURL";

export const META_CONFIG_KEY = "meta";
export const META_PIXEL_ID = "pixelID";
export const META_AWS_SECRET_KEY_FOR_PIXEL_ID = "awsSecretNameForPixelID";
export const META_ACCESS_TOKEN = "accessToken";
export const META_AWS_SECRET_KEY_FOR_ACCESS_TOKEN = "awsSecretNameForAccessToken";
export const META_TEST_EVENT_CODE = "testEventCode";

export const appConfigsJoiValidationSchema = Joi.object({
  [AWS_REGION_ATTR]: Joi.string().required(),
  [AWS_DEFAULT_REGION_ATTR]: Joi.string().required(),
  [NODE_ENV_CONFIG_KEY]: Joi.string().default(AppEnvironment.DEV),
  logFilePath: Joi.string().required(),
}).options({ allowUnknown: true });

export const DEV_TEST_ONLY_VARIABLES = [STATIC_DEV_OTP];

export function getEnvironmentName(): AppEnvironment {
  let envType: any = getPropertyFromEnvironment(NODE_ENV_CONFIG_KEY);
  if (!envType) throw new Error("Expect NODE_ENV environment variable to be present in the environment");
  if (!Object.values(AppEnvironment).includes(envType)) {
    // for tests sometimes we might not set environments. So set this to E2E_TEST
    envType = AppEnvironment.E2E_TEST;
  }
  return envType as AppEnvironment;
}

export function isLocalDevEnvironment(): boolean {
  return getEnvironmentName() === AppEnvironment.DEV;
}

export function isProductionEnvironment(): boolean {
  return getEnvironmentName() === AppEnvironment.PROD;
}

export function isE2ETestEnvironment(): boolean {
  return getEnvironmentName() === AppEnvironment.E2E_TEST;
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
  if (awsSecretKey === undefined || awsSecretKey == null || awsSecretKey === "") {
    if (customValue === undefined || customValue === "") {
      throw Error(`Neither ${awsSecretKey} nor ${customValue} is set.`);
    }
    return customValue;
  }

  return await SecretProvider.fetchSecretFromAWSSecretManager(awsSecretKey);
}

// Use this if there is no default needed
export async function getParameterValueFromAWSSecrets(awsSecretKey: string): Promise<string> {
  if (awsSecretKey === undefined || awsSecretKey == null || awsSecretKey === "") {
    return null;
  }

  return await SecretProvider.fetchSecretFromAWSSecretManager(awsSecretKey);
}
