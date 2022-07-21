import * as Joi from "joi";
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
  getPropertyFromEnvironment,
  isPropertyPresentInEnvironmentVariables,
  MONGO_AWS_SECRET_KEY_FOR_URI_ATTR,
  MONGO_CONFIG_KEY,
  MONGO_URI,
  MONGO_URI_ENV_KEY,
  resetPropertyFromEnvironment,
  SENDGRID_API_KEY,
  SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR,
  SENDGRID_CONFIG_KEY,
  setEnvironmentProperty,
  STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR,
  STRIPE_CONFIG_KEY,
  STRIPE_SECRET_KEY,
  TRULIOO_AWS_SECRET_KEY_FOR_DOCV_API_KEY_ATTR,
  TRULIOO_AWS_SECRET_KEY_FOR_IDV_ATTR,
  TRULIOO_CONFIG_KEY,
  TRULIOO_DOCV_API_KEY,
  TRULIOO_IDV,
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
  NOBA_PARTNER_ID,
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
  SUPPORTED_CRYPTO_TOKENS_FILE_NAME,
  SUPPORTED_CRYPTO_TOKENS_FILE_PATH,
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
} from "./ConfigurationUtils";
import * as fs from "fs";

import { TwilioConfigs } from "./configtypes/TwilioConfigs";
import { TruliooConfigs } from "./configtypes/TruliooConfigs";
import { SendGridConfigs } from "./configtypes/SendGridConfigs";
import { StripeConfigs } from "./configtypes/StripeConfigs";
import { MongoConfigs } from "./configtypes/MongoConfigs";
import { SardineConfigs } from "./configtypes/SardineConfigs";
import { NobaConfigs } from "./configtypes/NobaConfigs";
import { ZerohashConfigs } from "./configtypes/ZerohashConfigs";
import { KmsConfigs } from "./configtypes/KmsConfigs";

const envNameToPropertyFileNameMap = {
  [AppEnvironment.AWSDEV]: "awsdev.yaml",
  [AppEnvironment.DEV]: "localdevelopment.yaml",
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
   * "CONFIG_DIR" environment variable denotes the 'path to the YAML configuration file'.
   *
   * If "CONFIG_DIR" environment variable is not set,
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
  configs[SUPPORTED_CRYPTO_TOKENS_FILE_PATH] = join(configsDir, configs[SUPPORTED_CRYPTO_TOKENS_FILE_NAME]);
  configs[LOCATION_DATA_FILE_PATH] = join(configsDir, configs[LOCATION_DATA_FILE_NAME]);

  const updatedAwsConfigs = configureAwsCredentials(environment, configs);
  const vendorConfigs = await configureAllVendorCredentials(environment, updatedAwsConfigs);

  //validate configs
  return Joi.attempt(vendorConfigs, appConfigsJoiValidationSchema);
}

function configureAwsCredentials(environment: AppEnvironment, configs: Record<string, any>): Record<string, any> {
  if (environment === AppEnvironment.DEV) {
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
    configureTruliooCredentials,
    configureTwilioCredentials,
    configureStripeCredentials,
    configureMongoCredentials,
    configureSardineCredentials,
    configureZerohashCredentials,
    configureAwsKmsCredentials,
  ];
  for (let i = 0; i < vendorCredentialConfigurators.length; i++) {
    configs = await vendorCredentialConfigurators[i](environment, configs);
  }
  return configs;
}

async function configureStripeCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const stripeConfigs: StripeConfigs = configs[STRIPE_CONFIG_KEY];

  if (stripeConfigs === undefined) {
    const errorMessage =
      "\n'stripe' configurations are required. Please configure the stripe credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${STRIPE_CONFIG_KEY}" and populate "${STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR}" or "${STRIPE_SECRET_KEY}" ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  stripeConfigs.secretKey = await getParameterValue(stripeConfigs.awsSecretNameForSecretKey, stripeConfigs.secretKey);

  configs[STRIPE_CONFIG_KEY] = stripeConfigs;
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

async function configureTruliooCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  const truliooConfigs: TruliooConfigs = configs[TRULIOO_CONFIG_KEY];

  if (truliooConfigs === undefined) {
    const errorMessage =
      "\n'Trulioo' configurations are required. Please configure the Trulioo credentials in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${TRULIOO_CONFIG_KEY}" and populate ("${TRULIOO_AWS_SECRET_KEY_FOR_IDV_ATTR}" or "${TRULIOO_IDV}") AND ` +
      `("${TRULIOO_AWS_SECRET_KEY_FOR_DOCV_API_KEY_ATTR}" or "${TRULIOO_DOCV_API_KEY}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  truliooConfigs.TruliooDocVApiKey = await getParameterValue(
    truliooConfigs.awsSecretNameForDocVApiKey,
    truliooConfigs.TruliooDocVApiKey,
  );
  truliooConfigs.TruliooIDVApiKey = await getParameterValue(
    truliooConfigs.awsSecretNameForIDVApiKey,
    truliooConfigs.TruliooIDVApiKey,
  );

  configs[TRULIOO_CONFIG_KEY] = truliooConfigs;
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

async function configureMongoCredentials(
  environment: AppEnvironment,
  configs: Record<string, any>,
): Promise<Record<string, any>> {
  let mongoConfigs: MongoConfigs = configs[MONGO_CONFIG_KEY];

  if (environment === AppEnvironment.E2E_TEST) {
    if (!isPropertyPresentInEnvironmentVariables(MONGO_URI_ENV_KEY)) {
      const errorMessage = `\n'Mongo' configurations are required. Please configure '${MONGO_URI_ENV_KEY}' in environment varaible. current is ${JSON.stringify(
        process.env,
      )}`;

      throw Error(errorMessage);
    }

    mongoConfigs = {} as MongoConfigs;
    mongoConfigs.uri = getPropertyFromEnvironment(MONGO_URI_ENV_KEY);
    mongoConfigs.awsSecretNameForUri = undefined;
  }

  if (mongoConfigs === undefined) {
    const errorMessage =
      "\n'Mongo' configurations are required. Please configure the MongoDB URI in 'appconfigs/<ENV>.yaml' file.\n" +
      `You should configure the key "${MONGO_CONFIG_KEY}" and populate "${MONGO_AWS_SECRET_KEY_FOR_URI_ATTR}" or "${MONGO_URI}" ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  mongoConfigs.uri = await getParameterValue(mongoConfigs.awsSecretNameForUri, mongoConfigs.uri);

  configs[MONGO_CONFIG_KEY] = mongoConfigs;
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
      `You should configure the key "${NOBA_CONFIG_KEY}.${NOBA_TRANSACTION_CONFIG_KEY}" ` +
      `and populate ` +
      `("${SPREAD_PERCENTAGE}" or "${AWS_SECRET_KEY_FOR_SPREAD_PERCENTAGE}"), ` +
      `("${DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE}" or "${AWS_SECRET_KEY_FOR_DYNAMIC_CREDIT_CARD_FEE_PERCENTAGE}"), ` +
      `("${FIXED_CREDIT_CARD_FEE}" or "${AWS_SECRET_KEY_FOR_FIXED_CREDIT_CARD_FEE}") AND ` +
      `("${FLAT_FEE_DOLLARS}" or "${AWS_SECRET_KEY_FOR_FLAT_FEE_DOLLARS}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";
    throw Error(errorMessage);
  }

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
      `("${ZEROHASH_AWS_SECRET_KEY_FOR_PASS_PHRASE_ATTR}" or "${ZEROHASH_PASS_PHRASE}") ` +
      "based on whether you want to fetch the value from AWS Secrets Manager or provide it manually respectively.\n";

    throw Error(errorMessage);
  }

  zerohashConfigs.apiKey = await getParameterValue(zerohashConfigs.awsSecretNameforApiKey, zerohashConfigs.apiKey);
  zerohashConfigs.apiSecret = await getParameterValue(
    zerohashConfigs.awsSecretNameForApiSecret,
    zerohashConfigs.apiSecret,
  );

  zerohashConfigs.passPhrase = await getParameterValue(
    zerohashConfigs.awsSecretNameForPassPhrase,
    zerohashConfigs.passPhrase,
  );

  zerohashConfigs.host = await getParameterValue(zerohashConfigs.awsSecretNameForHost, zerohashConfigs.host);

  configs[ZEROHASH_CONFIG_KEY] = zerohashConfigs;
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
