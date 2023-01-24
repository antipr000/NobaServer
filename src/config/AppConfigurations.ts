import Joi from "joi";
import { join } from "path";
import { readConfigsFromYamlFiles } from "../core/utils/YamlJsonUtils";
import {
  appConfigsJoiValidationSchema,
  AppEnvironment,
  MASTER_CONFIG_DIRECTORY,
  AWS_ACCESS_KEY_ID_ATTR,
  AWS_ACCESS_KEY_ID_ENV_VARIABLE,
  AWS_DEFAULT_REGION_ATTR,
  AWS_DEFAULT_REGION_ENV_VARIABLE,
  AWS_REGION_ATTR,
  AWS_REGION_ENV_VARIABLE,
  AWS_SECRET_ACCESS_KEY_ATTR,
  AWS_SECRET_ACCESS_KEY_ENV_VARIABLE,
  getEnvironmentName,
  getParameterValue,
  getParameterValueFromAWSSecrets,
  resetPropertyFromEnvironment,
  SENDGRID_API_KEY,
  SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR,
  SENDGRID_CONFIG_KEY,
  setEnvironmentProperty,
  CHECKOUT_CONFIG_KEY,
  CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_PUBLIC_KEY,
  CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_SECRET_KEY,
  CHECKOUT_PUBLIC_KEY,
  CHECKOUT_SECRET_KEY,
  TWILIO_AUTH_TOKEN,
  TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR,
  TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR,
  TWILIO_CONFIG_KEY,
  TWILIO_SID,
  SARDINE_CONFIG_KEY,
  SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR,
  SARDINE_CLIENT_ID,
  SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR,
  SARDINE_SECRET_KEY,
  NOBA_CONFIG_KEY,
  ZEROHASH_CONFIG_KEY,
  ZEROHASH_AWS_SECRET_KEY_FOR_API_KEY_ATTR,
  ZEROHASH_API_KEY,
  ZEROHASH_API_SECRET,
  ZEROHASH_AWS_SECRET_KEY_FOR_PASS_PHRASE_ATTR,
  ZEROHASH_PASS_PHRASE,
  ZEROHASH_AWS_SECRET_KEY_FOR_API_SECRET_ATTR,
  ZEROHASH_AWS_SECRET_KEY_FOR_HOST_ATTR,
  ZEROHASH_HOST,
  KMS_CONFIG_KEY,
  KMS_CONFIG_CONTEXT_KEY,
  KMS_CONTEXT_STAGE,
  KMS_CONTEXT_ORIGIN,
  KMS_CONTEXT_PURPOSE,
  LOCATION_DATA_FILE_NAME,
  LOCATION_DATA_FILE_PATH,
  GENERATOR_KEY_KMS_ARN,
  AWS_SECRET_KEY_FOR_GENERATOR_KEY_KMS_ARN,
  FOLLOW_UP_KEY_KMS_ARN,
  AWS_SECRET_KEY_FOR_FOLLOW_UP_KEY_KMS_ARN,
  AWS_ACCOUNT_ID_ATTR,
  NOBA_TRANSACTION_CONFIG_KEY,
  SPREAD_PERCENTAGE,
  AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE,
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE,
  FIXED_CREDIT_CARD_FEE,
  AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS,
  COMMON_CONFIG_KEY,
  COMMON_CONFIG_CRYPTO_IMAGE_BASE_URL,
  COMMON_CONFIG_FIAT_IMAGE_BASE_URL,
  COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY,
  COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY,
  ZEROHASH_AWS_SECRET_KEY_FOR_PLATFORM_CODE,
  ZEROHASH_PLATFORM_CODE,
  ELLIPTIC_CONFIG_KEY,
  ELLIPTIC_AWS_SECRET_KEY_FOR_API_KEY_ATTR,
  ELLIPTIC_API_KEY,
  ELLIPTIC_BASE_URL,
  ELLIPTIC_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR,
  ELLIPTIC_SECRET_KEY,
  PLAID_CONFIG_KEY,
  PLAID_CLIENT_ID,
  PLAID_AWS_SECRET_KEY_FOR_CLIENT_ID,
  PLAID_SECRET_KEY,
  PLAID_AWS_SECRET_KEY_FOR_SECRET_KEY,
  PLAID_REDIRECT_URI,
  PLAID_AWS_SECRET_KEY_FOR_REDIRECT_URI,
  PLAID_ENVIRONMENT,
  PLAID_VERSION,
  CHECKOUT_PROCESSING_CHANNEL_ID,
  CHECKOUT_AWS_SECRET_NAME_FOR_WEBHOOK_SIGNATURE_KEY,
  CHECKOUT_WEBHOOK_SIGNATURE_KEY,
  DEPENDENCY_CONFIG_KEY,
  DEPENDENCY_EMAIL_CLIENT,
  DEV_TEST_ONLY_VARIABLES,
  CIRCLE_CONFIG_KEY,
  CIRCLE_ENVIRONMENT,
  CIRCLE_API_KEY,
  CIRCLE_AWS_SECRET_KEY_FOR_API_KEY,
  CIRCLE_AWS_SECRET_KEY_FOR_MASTER_WALLET_ID,
  CIRCLE_MASTER_WALLET_ID,
  NOBA_APP_SECRET_KEY,
  AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY,
  NOBA_WORKFLOW_CONFIG_KEY,
  NOBA_WORKFLOW_TASK_QUEUE,
  NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_TASK_QUEUE,
  NOBA_WORKFLOW_CLIENT_URL,
  NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_CLIENT_URL,
  NOBA_WORKFLOW_NAMESPACE,
  NOBA_WORKFLOW_CONNECTION_TIMEOUT_IN_MILLIS,
  MONO_AWS_SECRET_KEY_FOR_BASE_URL,
  MONO_AWS_SECRET_KEY_FOR_BEARER_TOKEN,
  MONO_BEARER_TOKEN,
  MONO_BASE_URL,
  MONO_CONFIG_KEY,
  MONO_AWS_SECRET_KEY_FOR_NOBA_ACCOUNT_ID,
  MONO_NOBA_ACCOUNT_ID,
  MONO_AWS_SECRET_KEY_FOR_WEBHOOK_SECRET,
  MONO_WEBHOOK_SECRET,
  AWS_MASTER_SECRET,
  NOBA_PRIVATE_BEARER_TOKEN,
  AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN,
  BUBBLE_CONFIG_KEY,
  BUBBLE_AWS_SECRET_KEY_FOR_BASE_URL,
  BUBBLE_BASE_URL,
  BUBBLE_AWS_SECRET_KEY_FOR_BEARER_TOKEN,
  BUBBLE_BEARER_TOKEN,
} from "./ConfigurationUtils";
import fs from "fs";

import { TwilioConfigs } from "./configtypes/TwilioConfigs";
import { SendGridConfigs } from "./configtypes/SendGridConfigs";
import { SardineConfigs } from "./configtypes/SardineConfigs";
import { NobaConfigs } from "./configtypes/NobaConfigs";
import { ZerohashConfigs } from "./configtypes/ZerohashConfigs";
import { KmsConfigs } from "./configtypes/KmsConfigs";
import { CommonConfigs } from "./configtypes/CommonConfigs";
import { CheckoutConfigs } from "./configtypes/CheckoutConfigs";
import { EllipticConfigs } from "./configtypes/EllipticConfig";
import { PlaidConfigs } from "./configtypes/PlaidConfigs";
import { DependencyConfigs, EmailClient } from "./configtypes/DependencyConfigs";
import { CircleConfigs, isValidCircleEnvironment } from "./configtypes/CircleConfigs";
import { NobaWorkflowConfig } from "./configtypes/NobaWorkflowConfig";
import { MonoConfigs } from "./configtypes/MonoConfig";
import { SecretProvider } from "./SecretProvider";
import { BubbleConfigs } from "./configtypes/BubbleConfigs";

const envNameToPropertyFileNameMap = {
  [AppEnvironment.AWSDEV]: "awsdev.yaml",
  [AppEnvironment.DEV]: "localdevelopment.yaml",
  [AppEnvironment.PARTNER]: "partner.yaml",
  [AppEnvironment.SANDBOX]: "sandbox.yaml",
  [AppEnvironment.PROD]: "production.yaml",
  [AppEnvironment.STAGING]: "staging.yaml",
  [AppEnvironment.E2E_TEST]: "e2e_test.yaml",
} as const;

export default async function loadAppConfigs() {
  // *** Application configurations loading logic here ***

  const environment: AppEnvironment = getEnvironmentName();
  console.log(`Environment: ${environment}`);
  const configFileName = envNameToPropertyFileNameMap[environment];

  /**
   * "CONFIGS_DIR" environment variable denotes the 'path to the YAML configuration file'.
   *
   * If "CONFIGS_DIR" environment variable is not set,
   *    Assumption is that the code is getting executed from the COMPILED 'dist/' filder.
   *
   *    Hence, '__dirname' will resolve to 'dist/' folder and as 'appconfigs/' directory
   *    is present in the same folder as 'main.js' in the 'dist/' folder as per the
   *    configuration of the 'assets' rule in 'nest-cli.json' file.
   *
   */
  const configsDir = process.env["CONFIGS_DIR"] ?? join(__dirname, "appconfigs");
  const mainPropertyFile = join(configsDir, configFileName);
  setEnvironmentProperty(MASTER_CONFIG_DIRECTORY, configsDir);

  /**
   * There can be extra properties that you might not want to put in the root configuration files.
   *
   * One reason for doing so can be that you don't want to push those changes in the source control
   * directory.
   * For example,
   *    all the VENDOR CREDENTIALS stored in the YAML files (staging.yaml or production.yaml)
   *    are actually a reference to AWS SECRETS MANAGER so that you can avoid pushing them to
   *    your source control repository.
   * BUT where will you store AWS CLIENT_ID & CLIENT_SECRET to actually connect to AWS SECRETS MANAGER?
   * You can't hardcode them as it'll anyways leak all the SECRETS in SECRETS MANAGER.
   *
   * So, you have to configure them separately in environment variables. But setting these
   *    ENV variables everytime you do a new terminal will slow down & to be fast you'll store
   *    these credentials somewhere where it is very handy WHICH INCREASES RISK.
   *
   * For avoiding this, we have "secrets.yaml" which is already added in '.gitignore' and you can
   *    configure any such secret credential in "secrets.yaml" and it will be applied during app startup.
   */
  const extraSecretsFiles = [];
  if (fs.existsSync(join(configsDir, "secrets.yaml"))) {
    extraSecretsFiles.push(join(configsDir, "secrets.yaml"));
  }

  const configs = readConfigsFromYamlFiles(mainPropertyFile, ...extraSecretsFiles);
  configs[LOCATION_DATA_FILE_PATH] = join(configsDir, configs[LOCATION_DATA_FILE_NAME]);

  const updatedAwsConfigs = configureAwsCredentials(environment, configs);
  await SecretProvider.loadAWSMasterSecret(configs[AWS_MASTER_SECRET]);

  const vendorConfigs = await configureAllVendorCredentials(environment, updatedAwsConfigs);
  const filteredConfigs = ensureDevOnlyConfig(environment, vendorConfigs);

  // initializeAWSEnv();

  //validate configs
  return Joi.attempt(filteredConfigs, appConfigsJoiValidationSchema);
}

function ensureDevOnlyConfig(environment: AppEnvironment, configs: Record<string, any>): Record<string, any> {
  // There are certain configurations we want to ensure are NOT set in non-dev/test envs. This ensures
  // that if they are set, they get removed.
  if (
    [AppEnvironment.DEV, AppEnvironment.AWSDEV, AppEnvironment.E2E_TEST, AppEnvironment.PARTNER].indexOf(environment) ==
    -1
  ) {
    DEV_TEST_ONLY_VARIABLES.forEach(
      item =>
        delete configs[item] &&
        console.error(
          `Dev/Test-only configuration value should be removed from configuration file in ${environment} environment: "${item}". Ignoring.`,
        ),
    );
  }

  return configs;
}

function configureAwsCredentials(environment: AppEnvironment, configs: Record<string, any>): Record<string, any> {
  if (environment === AppEnvironment.DEV || environment === AppEnvironment.E2E_TEST) {
    // 'DEV' is for local development and hence AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY environment variables are required.
    const awsAccessKeyId = configs[AWS_ACCESS_KEY_ID_ATTR];
    const awsSecretAccessKey = configs[AWS_SECRET_ACCESS_KEY_ATTR];

    if (awsAccessKeyId === undefined || awsSecretAccessKey === undefined) {
      const errorMessage =
        "\n\nAWS Credentials needs to be configured in environment variables for local testing.\n" +
        `Please set the value of "${AWS_ACCESS_KEY_ID_ATTR}" and "${AWS_SECRET_ACCESS_KEY_ATTR}" in 'appconfigs/secrets.yaml' file.\n\n`;

      throw Error(errorMessage);
    }

    setEnvironmentProperty(AWS_ACCESS_KEY_ID_ENV_VARIABLE, awsAccessKeyId);
    setEnvironmentProperty(AWS_SECRET_ACCESS_KEY_ENV_VARIABLE, awsSecretAccessKey);
  } else {
    // 'STAGING' or 'PROD' will be expected to run in 'EC2' (with a role attached).
    // So, for these environments temporary role credentials will be used for any AWS services.
    //
    // If more than one credential source is available to the SDK (eg - both env-variables & ec2-role),
    // the default precedence of selection can be found at:
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
    //
    // As mentioned in the above doc, ENV variables will take precedence over ec2-role.
    // So, resetting the AWS related environment variables (if any) for 'STAGING' & 'PROD'.

    resetPropertyFromEnvironment(AWS_ACCESS_KEY_ID_ENV_VARIABLE);
    resetPropertyFromEnvironment(AWS_SECRET_ACCESS_KEY_ENV_VARIABLE);

    delete configs[AWS_ACCESS_KEY_ID_ATTR];
    delete configs[AWS_SECRET_ACCESS_KEY_ATTR];
  }

  const awsDefaultRegion = configs[AWS_DEFAULT_REGION_ATTR];
  const awsRegion = configs[AWS_REGION_ATTR];
  const awsAccountID = configs[AWS_ACCOUNT_ID_ATTR];

  if (!awsAccountID) {
    throw new Error(
      "Expected AWS Account ID to be configured in app configuration file with key:" + AWS_ACCESS_KEY_ID_ATTR,
    );
  }

  setEnvironmentProperty(AWS_ACCOUNT_ID_ATTR, awsAccountID);
  setEnvironmentProperty(AWS_DEFAULT_REGION_ENV_VARIABLE, awsDefaultRegion);
  setEnvironmentProperty(AWS_REGION_ENV_VARIABLE, awsRegion);

  // Set all KMS keys in config
  const kms: Record<string, any> = configs["awskms"];

  for (const key in kms) {
    setEnvironmentProperty(key, kms[key]);
  }

  return configs;
}

async function configureAllVendorCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const vendorCredentialConfigurators = [
    configureNobaParameters,
    configureSendgridCredentials,
    configureTwilioCredentials,
    configureCheckoutCredentials,
    configureSardineCredentials,
    configureZerohashCredentials,
    configureAwsKmsCredentials,
    configureCommonConfigurations,
    configureEllipticCredentials,
    configurePlaidCredentials,
    configureDependencies,
    configureCircleConfigurations,
    configureNobaWorkflowCredentials,
    configureMonoCredentials,
    configureBubbleCredentials,
  ];
  for (let i = 0; i < vendorCredentialConfigurators.length; i++) {
    configs = await vendorCredentialConfigurators[i](environment, configs);
  }
  return configs;
}

async function configureCheckoutCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const checkoutConfigs: CheckoutConfigs = configs[CHECKOUT_CONFIG_KEY];

  if (checkoutConfigs === undefined) {
    const errorMessage =
      "\n'checkout' configurations are required. Please configure the checkout credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure ${CHECKOUT_CONFIG_KEY} with sub-values for ` +
      `(${CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_PUBLIC_KEY} or ${CHECKOUT_PUBLIC_KEY}), ` +
      `(${CHECKOUT_AWS_SECRET_NAME_FOR_WEBHOOK_SIGNATURE_KEY} or ${CHECKOUT_WEBHOOK_SIGNATURE_KEY}), ` +
      `(${CHECKOUT_AWS_SECRET_NAME_FOR_CHECKOUT_SECRET_KEY} or ${CHECKOUT_SECRET_KEY}), and ` +
      `${CHECKOUT_PROCESSING_CHANNEL_ID}.`;

    throw Error(errorMessage);
  }

  checkoutConfigs.publicKey = await getParameterValue(
    checkoutConfigs.awsSecretNameForPublicKey,
    checkoutConfigs.publicKey,
  );
  checkoutConfigs.secretKey = await getParameterValue(
    checkoutConfigs.awsSecretNameForSecretKey,
    checkoutConfigs.secretKey,
  );
  checkoutConfigs.webhookSignatureKey = await getParameterValue(
    checkoutConfigs.awsSecretNameForWebhookSignatureKey,
    checkoutConfigs.webhookSignatureKey,
  );

  checkoutConfigs.couponCode = await getParameterValue(null, checkoutConfigs.couponCode);
  checkoutConfigs.partnerId = parseInt(await getParameterValue(null, checkoutConfigs.partnerId.toString()));
  checkoutConfigs.processingChannelId = await getParameterValue(null, checkoutConfigs.processingChannelId);
  checkoutConfigs.apiUrl = await getParameterValue(null, checkoutConfigs.apiUrl);
  checkoutConfigs.nobaWebhookUrl = await getParameterValue(null, checkoutConfigs.nobaWebhookUrl);

  configs[CHECKOUT_CONFIG_KEY] = checkoutConfigs;
  return configs;
}

async function configureTwilioCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const twilioConfigs: TwilioConfigs = configs[TWILIO_CONFIG_KEY];

  if (twilioConfigs === undefined) {
    const errorMessage =
      "\n'Twilio' configurations are required. Please configure the Twilio credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${TWILIO_CONFIG_KEY}" and populate ("${TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR}" or "${TWILIO_SID}") AND ` +
      `("${TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR}" or "${TWILIO_AUTH_TOKEN}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  twilioConfigs.SID = await getParameterValue(twilioConfigs.awsSecretNameForSID, twilioConfigs.SID);
  twilioConfigs.authToken = await getParameterValue(twilioConfigs.awsSecretNameForAuthToken, twilioConfigs.authToken);

  configs[TWILIO_CONFIG_KEY] = twilioConfigs;
  return configs;
}

async function configureMonoCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const monoConfig: MonoConfigs = configs[MONO_CONFIG_KEY];

  if (monoConfig === undefined) {
    const errorMessage =
      "\n'Mono' configurations are required. Please configure the Mono credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${MONO_CONFIG_KEY}" and populate ` +
      `("${MONO_AWS_SECRET_KEY_FOR_NOBA_ACCOUNT_ID}" or "${MONO_NOBA_ACCOUNT_ID}") ` +
      `("${MONO_AWS_SECRET_KEY_FOR_WEBHOOK_SECRET}" or "${MONO_WEBHOOK_SECRET}") ` +
      `("${MONO_AWS_SECRET_KEY_FOR_BASE_URL}" or "${MONO_BASE_URL}") AND ` +
      `("${MONO_AWS_SECRET_KEY_FOR_BEARER_TOKEN}" or "${MONO_BEARER_TOKEN}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  monoConfig.baseURL = await getParameterValue(monoConfig.awsSecretNameForBaseURL, monoConfig.baseURL);
  monoConfig.bearerToken = await getParameterValue(monoConfig.awsSecretNameForBearerToken, monoConfig.bearerToken);
  monoConfig.webhookSecret = await getParameterValue(
    monoConfig.awsSecretNameForWebhookSecret,
    monoConfig.webhookSecret,
  );
  monoConfig.nobaAccountID = await getParameterValue(
    monoConfig.awsSecretNameForNobaAccountID,
    monoConfig.nobaAccountID,
  );

  configs[MONO_CONFIG_KEY] = monoConfig;
  return configs;
}

async function configureBubbleCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const bubbleConfigs: BubbleConfigs = configs[BUBBLE_CONFIG_KEY];

  if (bubbleConfigs === undefined) {
    const errorMessage =
      "\n'Bubble' configurations are required. Please configure the Bubble credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${BUBBLE_CONFIG_KEY}" and populate ` +
      `("${BUBBLE_AWS_SECRET_KEY_FOR_BASE_URL}" or "${BUBBLE_BASE_URL}") AND ` +
      `("${BUBBLE_AWS_SECRET_KEY_FOR_BEARER_TOKEN}" or "${BUBBLE_BEARER_TOKEN}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  bubbleConfigs.baseURL = await getParameterValue(bubbleConfigs.awsSecretNameForBaseURL, bubbleConfigs.baseURL);
  bubbleConfigs.bearerToken = await getParameterValue(
    bubbleConfigs.awsSecretNameForBearerToken,
    bubbleConfigs.bearerToken,
  );

  configs[BUBBLE_CONFIG_KEY] = bubbleConfigs;
  return configs;
}

async function configureSardineCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const sardineConfigs: SardineConfigs = configs[SARDINE_CONFIG_KEY];

  if (sardineConfigs === undefined) {
    const errorMessage =
      "\n'Sardine' configurations are required. Please configure the Sardine credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${SARDINE_CONFIG_KEY}" and populate ("${SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR}" or "${SARDINE_CLIENT_ID}") AND ` +
      `("${SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR}" or "${SARDINE_SECRET_KEY}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  sardineConfigs.clientID = await getParameterValue(
    sardineConfigs.awsSecretNameForSardineClientID,
    sardineConfigs.clientID,
  );
  sardineConfigs.secretKey = await getParameterValue(
    sardineConfigs.awsSecretNameForSardineSecretKey,
    sardineConfigs.secretKey,
  );
  sardineConfigs.webhookSecretKey = await getParameterValue(
    sardineConfigs.awsSecretNameForSardineWebhookSecretKey,
    sardineConfigs.webhookSecretKey,
  );

  sardineConfigs.sardineBaseUri = await getParameterValue(undefined, sardineConfigs.sardineBaseUri);

  configs[SARDINE_CONFIG_KEY] = sardineConfigs;
  return configs;
}

async function configureSendgridCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const sendgridConfigs: SendGridConfigs = configs[SENDGRID_CONFIG_KEY];

  if (sendgridConfigs === undefined) {
    const errorMessage =
      "\n'Sendgrid' configurations are required. Please configure the Sendgrid credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${SENDGRID_CONFIG_KEY}" and populate "${SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR}" or "${SENDGRID_API_KEY}" ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  sendgridConfigs.apiKey = await getParameterValue(sendgridConfigs.awsSecretNameForApiKey, sendgridConfigs.apiKey);

  configs[SENDGRID_CONFIG_KEY] = sendgridConfigs;
  return configs;
}

async function configureDependencies(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const dependencyConfigs: DependencyConfigs = configs[DEPENDENCY_CONFIG_KEY];

  if (dependencyConfigs === undefined) {
    const errorMessage =
      "\n'Dependencies' configurations are required. Please configure the dependencies in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${DEPENDENCY_CONFIG_KEY}" and populate "${DEPENDENCY_EMAIL_CLIENT}"\n`;

    throw Error(errorMessage);
  }

  const allowedEmailClients = [EmailClient.STUB, EmailClient.SENDGRID];
  if (!allowedEmailClients.includes(dependencyConfigs.emailClient)) {
    const errorMessage = `"${DEPENDENCY_EMAIL_CLIENT}" should be one of ${allowedEmailClients}`;
    throw Error(errorMessage);
  }

  configs[DEPENDENCY_CONFIG_KEY] = dependencyConfigs;
  return configs;
}

async function configureNobaParameters(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const nobaConfigs: NobaConfigs = configs[NOBA_CONFIG_KEY];

  if (nobaConfigs === undefined || nobaConfigs.transaction === undefined) {
    const errorMessage =
      "\n'Noba' configurations are required. Please configure the Noba environment variables " +
      "in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the keys "${NOBA_CONFIG_KEY}.${NOBA_TRANSACTION_CONFIG_KEY}" AND ` +
      `("${NOBA_APP_SECRET_KEY}" or "${AWS_SECRET_KEY_FOR_NOBA_APP_SECRET_KEY}") AND ` +
      `("${NOBA_PRIVATE_BEARER_TOKEN}" or "${AWS_SECRET_KEY_FOR_NOBA_PRIVATE_BEARER_TOKEN}") AND ` +
      "and populate " +
      `("${SPREAD_PERCENTAGE}" or "${AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE}"), ` +
      `("${DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE}" or "${AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE}"), ` +
      `("${FIXED_CREDIT_CARD_FEE}" or "${AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE}") AND ` +
      `("${FLAT_FEE_DOLLARS}" or "${AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";
    throw Error(errorMessage);
  }

  nobaConfigs.appSecretKey = await getParameterValue(nobaConfigs.awsSecretKeyForAppSecretKey, nobaConfigs.appSecretKey);
  nobaConfigs.privateBearerToken = await getParameterValue(
    nobaConfigs.awsSecretKeyForPrivateBearerToken,
    nobaConfigs.privateBearerToken,
  );

  nobaConfigs.transaction.depositFeeAmount = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForDepositFeeAmount,
      nobaConfigs.transaction.depositFeeAmount.toString(),
    ),
  );
  nobaConfigs.transaction.depositFeePercentage = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForDepositFeePercentage,
      nobaConfigs.transaction.depositFeePercentage.toString(),
    ),
  );
  nobaConfigs.transaction.dynamicCreditCardFeePercentage = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForDynamicCreditCardFeePercentage,
      nobaConfigs.transaction.dynamicCreditCardFeePercentage.toString(),
    ),
  );
  nobaConfigs.transaction.fixedCreditCardFee = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForFixedCreditCardFee,
      nobaConfigs.transaction.fixedCreditCardFee.toString(),
    ),
  );
  nobaConfigs.transaction.flatFeeDollars = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForFlatFeeDollars,
      nobaConfigs.transaction.flatFeeDollars.toString(),
    ),
  );
  nobaConfigs.transaction.spreadPercentage = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForSpreadPercentage,
      nobaConfigs.transaction.spreadPercentage.toString(),
    ),
  );

  nobaConfigs.transaction.slippageAllowedPercentage = Number(
    await getParameterValue(
      nobaConfigs.transaction.awsSecretKeyForSlippageAllowedPercentage,
      nobaConfigs.transaction.slippageAllowedPercentage.toString(),
    ),
  );

  configs[NOBA_CONFIG_KEY] = nobaConfigs;
  return configs;
}

async function configureZerohashCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const zerohashConfigs: ZerohashConfigs = configs[ZEROHASH_CONFIG_KEY];
  if (zerohashConfigs === undefined) {
    const errorMessage =
      "\n'Zerohash' configurations are required. Please configure the Zerohash credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${ZEROHASH_CONFIG_KEY}" and populate ` +
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_API_KEY_ATTR}" or "${ZEROHASH_API_KEY}"), ` +
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_HOST_ATTR}" or "${ZEROHASH_HOST}"), ` +
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_API_SECRET_ATTR}" or "${ZEROHASH_API_SECRET}") AND ` +
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_PASS_PHRASE_ATTR}" or "${ZEROHASH_PASS_PHRASE}") AND ` +
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_PLATFORM_CODE}" or "${ZEROHASH_PLATFORM_CODE}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }
  zerohashConfigs.apiKey = await getParameterValue(zerohashConfigs.awsSecretNameForApiKey, zerohashConfigs.apiKey);

  zerohashConfigs.apiSecret = await getParameterValue(
    zerohashConfigs.awsSecretNameForApiSecret,
    zerohashConfigs.apiSecret,
  );

  zerohashConfigs.passPhrase = await getParameterValue(
    zerohashConfigs.awsSecretNameForPassPhrase,
    zerohashConfigs.passPhrase,
  );

  zerohashConfigs.host = await getParameterValue(zerohashConfigs.awsSecretNameForHost, zerohashConfigs.host);

  zerohashConfigs.platformCode = await getParameterValue(
    zerohashConfigs.awsSecretNameForPlatformCode,
    zerohashConfigs.platformCode,
  );

  configs[ZEROHASH_CONFIG_KEY] = zerohashConfigs;
  return configs;
}

async function configurePlaidCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const plaidConfigs: PlaidConfigs = configs[PLAID_CONFIG_KEY];
  if (plaidConfigs === undefined) {
    const errorMessage =
      "\n'Plaid' configurations are required. Please configure the Plaid credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${PLAID_CONFIG_KEY}" and populate ` +
      `("${PLAID_AWS_SECRET_KEY_FOR_CLIENT_ID}" or "${PLAID_CLIENT_ID}"), ` +
      `("${PLAID_AWS_SECRET_KEY_FOR_SECRET_KEY}" or "${PLAID_SECRET_KEY}"), ` +
      `("${PLAID_AWS_SECRET_KEY_FOR_REDIRECT_URI}" or "${PLAID_REDIRECT_URI}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n" +
      `Also make sure '${PLAID_ENVIRONMENT}' AND '${PLAID_VERSION}' are also populated correctly.`;

    throw Error(errorMessage);
  }
  plaidConfigs.secretKey = await getParameterValue(plaidConfigs.awsSecretNameForSecretKey, plaidConfigs.secretKey);

  plaidConfigs.clientID = await getParameterValue(plaidConfigs.awsSecretNameForClientID, plaidConfigs.clientID);

  plaidConfigs.redirectUri = await getParameterValue(
    plaidConfigs.awsSecretNameForRedirectUri,
    plaidConfigs.redirectUri,
  );

  configs[PLAID_CONFIG_KEY] = plaidConfigs;
  return configs;
}

async function configureEllipticCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const ellipticConfigs: EllipticConfigs = configs[ELLIPTIC_CONFIG_KEY];

  if (ellipticConfigs === undefined) {
    const errorMessage =
      "\n'Elliptic' configurations are required. Please configure the Elliptic credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${ELLIPTIC_CONFIG_KEY}" and populate ` +
      `("${ELLIPTIC_AWS_SECRET_KEY_FOR_API_KEY_ATTR}" or "${ELLIPTIC_API_KEY}"), ` +
      `("${ELLIPTIC_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR}" or "${ELLIPTIC_SECRET_KEY}"), ` +
      `"${ELLIPTIC_BASE_URL}"), ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  ellipticConfigs.apiKey = await getParameterValue(ellipticConfigs.awsSecretNameForApiKey, ellipticConfigs.apiKey);
  ellipticConfigs.secretKey = await getParameterValue(
    ellipticConfigs.awsSecretNameForSecretKey,
    ellipticConfigs.secretKey,
  );
  ellipticConfigs.baseUrl = await getParameterValue(null, ellipticConfigs.baseUrl);

  configs[ELLIPTIC_CONFIG_KEY] = ellipticConfigs;

  return configs;
}

async function configureNobaWorkflowCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const nobaWorkflowConfigs: NobaWorkflowConfig = configs[NOBA_WORKFLOW_CONFIG_KEY];

  if (nobaWorkflowConfigs === undefined) {
    const errorMessage =
      "\n'Noba Workflow' configurations are required. Please configure the Noba Workflow credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${NOBA_WORKFLOW_CONFIG_KEY}" and populate ` +
      `"${NOBA_WORKFLOW_NAMESPACE}", "${NOBA_WORKFLOW_CONNECTION_TIMEOUT_IN_MILLIS}" ` +
      `("${NOBA_WORKFLOW_TASK_QUEUE}" or "${NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_TASK_QUEUE}"), ` +
      `("${NOBA_WORKFLOW_CLIENT_URL}" or "${NOBA_WORKFLOW_AWS_SECRET_KEY_FOR_CLIENT_URL}"), ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  nobaWorkflowConfigs.taskQueue = await getParameterValue(
    nobaWorkflowConfigs.awsSecretNameForTaskQueue,
    nobaWorkflowConfigs.taskQueue,
  );
  nobaWorkflowConfigs.clientUrl = await getParameterValue(
    nobaWorkflowConfigs.awsSecretNameForClientUrl,
    nobaWorkflowConfigs.clientUrl,
  );
  nobaWorkflowConfigs.namespace = await getParameterValue(null, nobaWorkflowConfigs.namespace);
  nobaWorkflowConfigs.connectionTimeoutInMs = (await getParameterValue(
    null,
    nobaWorkflowConfigs.connectionTimeoutInMs.toString(),
  )) as any;

  // OK for this to be undefined in environments where temporal cloud is not used
  nobaWorkflowConfigs.temporalCloudCertificate = await getParameterValueFromAWSSecrets(
    nobaWorkflowConfigs.awsSecretForTemporalCloudCertificate,
  );

  // OK for this to be undefined in environments where temporal cloud is not used
  nobaWorkflowConfigs.temporalCloudPrivateKey = await getParameterValueFromAWSSecrets(
    nobaWorkflowConfigs.awsSecretForTemporalCloudPrivateKey,
  );

  configs[NOBA_WORKFLOW_CONFIG_KEY] = nobaWorkflowConfigs;

  return configs;
}

async function configureCircleConfigurations(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const circleConfigs: CircleConfigs = configs[CIRCLE_CONFIG_KEY];

  if (circleConfigs === undefined) {
    const errorMessage =
      "\n'Circle' configurations are required. Please configure the Circle configurations in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${CIRCLE_CONFIG_KEY}" and populate ` +
      `("${CIRCLE_API_KEY}" or "${CIRCLE_AWS_SECRET_KEY_FOR_API_KEY}") ` +
      `("${CIRCLE_MASTER_WALLET_ID}" or "${CIRCLE_AWS_SECRET_KEY_FOR_MASTER_WALLET_ID}") AND ` +
      `"${CIRCLE_ENVIRONMENT}" ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  circleConfigs.apiKey = await getParameterValue(circleConfigs.awsSecretNameForApiKey, circleConfigs.apiKey);
  circleConfigs.masterWalletID = await getParameterValue(
    circleConfigs.awsSecretNameForMasterWalletID,
    circleConfigs.masterWalletID,
  );

  circleConfigs.env = await getParameterValue(null, circleConfigs.env);
  if (!isValidCircleEnvironment(circleConfigs.env)) {
    throw Error(`"${circleConfigs.env}" is not a valid Circle envs.`);
  }

  configs[CIRCLE_CONFIG_KEY] = circleConfigs;
  return configs;
}

async function configureAwsKmsCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const kmsConfigs: KmsConfigs = configs[KMS_CONFIG_KEY];

  if (kmsConfigs === undefined || kmsConfigs.context === undefined || kmsConfigs.ssn === undefined) {
    const errorMessage =
      "\n'KMS' configurations are required. Please configure the KMS credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${KMS_CONFIG_KEY}" and populate ` +
      `"${KMS_CONFIG_CONTEXT_KEY}.${KMS_CONTEXT_STAGE}", ` +
      `"${KMS_CONFIG_CONTEXT_KEY}.${KMS_CONTEXT_ORIGIN}", ` +
      `"${KMS_CONFIG_CONTEXT_KEY}.${KMS_CONTEXT_PURPOSE}", ` +
      `("${KMS_CONFIG_CONTEXT_KEY}.${GENERATOR_KEY_KMS_ARN}" or "${KMS_CONFIG_CONTEXT_KEY}.${AWS_SECRET_KEY_FOR_GENERATOR_KEY_KMS_ARN}"), AND ` +
      `("${KMS_CONFIG_CONTEXT_KEY}.${FOLLOW_UP_KEY_KMS_ARN}" or "${KMS_CONFIG_CONTEXT_KEY}.${AWS_SECRET_KEY_FOR_FOLLOW_UP_KEY_KMS_ARN}").`;

    throw Error(errorMessage);
  }

  kmsConfigs.context.origin = await getParameterValue(undefined, kmsConfigs.context.origin);
  kmsConfigs.context.purpose = await getParameterValue(undefined, kmsConfigs.context.purpose);
  kmsConfigs.context.stage = await getParameterValue(undefined, kmsConfigs.context.stage);
  kmsConfigs.ssn.generatorKeyArn = await getParameterValue(
    kmsConfigs.ssn.awsSecretNameForGeneratorKeyArn,
    kmsConfigs.ssn.generatorKeyArn,
  );
  kmsConfigs.ssn.followUpKeyArn = await getParameterValue(
    kmsConfigs.ssn.awsSecretNameForFollowUpKeyArn,
    kmsConfigs.ssn.followUpKeyArn,
  );

  configs[KMS_CONFIG_KEY] = kmsConfigs;
  return configs;
}

async function configureCommonConfigurations(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const commonConfigs: CommonConfigs = configs[COMMON_CONFIG_KEY];

  if (commonConfigs === undefined) {
    const errorMessage =
      "\n'Common' configurations are required. Please configure the Noba environment variables " +
      "in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${COMMON_CONFIG_KEY}" ` +
      "and populate " +
      `("${COMMON_CONFIG_CRYPTO_IMAGE_BASE_URL}"), ` +
      `("${COMMON_CONFIG_FIAT_IMAGE_BASE_URL}"), ` +
      `("${COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY}") AND ` +
      `("${COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";
    throw Error(errorMessage);
  }

  commonConfigs.lowAmountThreshold = Number(
    await getParameterValue(undefined, commonConfigs.lowAmountThreshold.toString()),
  );
  commonConfigs.highAmountThreshold = Number(
    await getParameterValue(undefined, commonConfigs.highAmountThreshold.toString()),
  );
  commonConfigs.cryptoImageBaseUrl = await getParameterValue(undefined, commonConfigs.cryptoImageBaseUrl);
  commonConfigs.fiatImageBaseUrl = await getParameterValue(undefined, commonConfigs.fiatImageBaseUrl);

  configs[COMMON_CONFIG_KEY] = commonConfigs;
  return configs;
}
