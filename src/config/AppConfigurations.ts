import * as Joi from "joi";
import { join } from "path";
import { readConfigsFromYamlFiles } from "../core/utils/YamlJsonUtils";
import {
  appConfigsJoiValidationSchema,
  AppEnvironment,
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
  getPropertyFromEvironment,
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
} from "./ConfigurationUtils";
import * as fs from "fs";

import { TwilioConfigs } from "./configtypes/TwilioConfigs";
import { TruliooConfigs } from "./configtypes/TruliooConfigs";
import { SendGridConfigs } from "./configtypes/SendGridConfigs";
import { StripeConfigs } from "./configtypes/StripeConfigs";
import { MongoConfigs } from "./configtypes/MongoConfigs";

const envNameToPropertyFileNameMap = {
  [AppEnvironment.DEV]: "localdevelopment.yaml",
  [AppEnvironment.PROD]: "production.yaml",
  [AppEnvironment.STAGING]: "staging.yaml",
  [AppEnvironment.E2E_TEST]: "e2e_test.yaml",
} as const;

export default async function loadAppConfigs() {
  // *** Application configurations loading logic here ***

  const environment: AppEnvironment = getEnvironmentName();
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
   *    these credentials somewhere where it is very handy WHCIH INCREASES RISK. 
   * 
   * For avoiding this, we have "secrets.yaml" which is already added in '.gitignore' and you can
   *    configure any such secret credential in "secrets.yaml" and it will be applied during app startup.
   */
  const extraSecretsFiles = [];
  if (fs.existsSync(join(configsDir, "secrets.yaml"))) {
    extraSecretsFiles.push(join(configsDir, "secrets.yaml"));
  }

  const configs = readConfigsFromYamlFiles(mainPropertyFile, ...extraSecretsFiles);

  const updatedAwsConfigs = configureAwsCredentials(environment, configs);
  const finalConfigs = await configureAllVendorCredentials(environment, updatedAwsConfigs);

  //validate configs
  return Joi.attempt(finalConfigs, appConfigsJoiValidationSchema);
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

  setEnvironmentProperty(AWS_DEFAULT_REGION_ENV_VARIABLE, awsDefaultRegion);
  setEnvironmentProperty(AWS_REGION_ENV_VARIABLE, awsRegion);

  return configs;
}

async function configureAllVendorCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
  const vendorCredentialConfigurators = [
    configureSendgridCredentials,
    configureTruliooCredentials,
    configureTwilioCredentials,
    configureStripeCredentials,
    configureMongoCredentials,
  ];
  for (let i = 0; i < vendorCredentialConfigurators.length; i++) {
    configs = await vendorCredentialConfigurators[i](environment, configs);
  }
  return configs;
}

async function configureStripeCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
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

async function configureTwilioCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
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
  twilioConfigs.fromPhoneNumber = twilioConfigs.fromPhoneNumber;

  configs[TWILIO_CONFIG_KEY] = twilioConfigs;
  return configs;
}

async function configureTruliooCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
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

async function configureSendgridCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
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

async function configureMongoCredentials(environment: AppEnvironment, configs: Record<string, any>): Promise<Record<string, any>> {
  let mongoConfigs: MongoConfigs = configs[MONGO_CONFIG_KEY];

  if (environment === AppEnvironment.E2E_TEST) {
    if (!isPropertyPresentInEnvironmentVariables(MONGO_URI_ENV_KEY)) {
      const errorMessage =
        `\n'Mongo' configurations are required. Please configure '${MONGO_URI_ENV_KEY}' in environment varaible. current is ${JSON.stringify(process.env)}`;

      throw Error(errorMessage);
    }

    mongoConfigs = {} as MongoConfigs;
    mongoConfigs.uri = getPropertyFromEvironment(MONGO_URI_ENV_KEY);
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