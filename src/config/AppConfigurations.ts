import * as Joi from 'joi';
import { join, dirname } from 'path';
import { readConfigsFromYamlFiles } from '../core/utils/YamlJsonUtils';
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
  resetPropertyFromEnvironment,
  setEnvironmentProperty
} from './ConfigurationUtils';
import { SecretProvider } from './SecretProvider';
import * as fs from 'fs';



const envNameToPropertyFileNameMap = {
  [AppEnvironment.DEV]: "localdevelopment.yaml",
  [AppEnvironment.PROD]: "production.yaml",
  [AppEnvironment.STAGING]: "staging.yaml"
} as const;

export default function loadAppConfigs() {

  // *** Application configurations loading logic here ***

  const environment: AppEnvironment = getEnvironmentName();
  const configFileName = envNameToPropertyFileNameMap[environment];

  // if custom path not given then look for the configs in the dist folder, __dirname will resolve to dist folder as this file will in main.js generated javascript file
  // and we putting configs directory in dist folder see nest-cli.json file
  const configsDir = process.env["CONFIGS_DIR"] ?? join(__dirname, "appconfigs");

  // //comma separated list of absolute paths to override config files which can be used to override configs from main property file, file coming in the last overrides previous files
  // const overrideFilesPaths = process.env["CONFIGS_OVERRIDE_FILES"]?.split(",") ?? [];

  const mainPropertyFile = join(configsDir, configFileName);
  let extraSecretsFiles = [];

  if (fs.existsSync(join(configsDir, "secrets.yaml"))) {
    extraSecretsFiles.push(join(configsDir, "secrets.yaml"));
  }

  console.log(`Configs directory is ${configsDir} and config file name is ${configFileName}`);
  console.log(`Other secrets files: ${extraSecretsFiles}`);

  const configs = readConfigsFromYamlFiles(mainPropertyFile, ...extraSecretsFiles);
  // configs = SecretProvider.loadSecrets(configs);

  //merge configs with override files

  //TODO if needed merge configs here with environment variable configs (some variables may be coming from secrets manager)
  return configureAwsCredentials(environment, Joi.attempt(configs, appConfigsJoiValidationSchema)); //validate configs  
};

function configureAwsCredentials(environment: AppEnvironment, configs: Record<string, any>): Record<string, any> {
  if (environment === AppEnvironment.DEV) {
    // 'DEV' is for local development and hence AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY environment variables are required. 
    const awsAccessKeyId = configs[AWS_ACCESS_KEY_ID_ATTR];
    const awsSecretAccessKey = configs[AWS_SECRET_ACCESS_KEY_ATTR];

    if (awsAccessKeyId === undefined || awsSecretAccessKey === undefined) {
      const errorMessage = `\n\nAWS Credentials needs to be configured in environment variables for local testing.\n` +
        `Please set the value of "${AWS_ACCESS_KEY_ID_ATTR}" and "${AWS_SECRET_ACCESS_KEY_ATTR}" in 'appconfigs/secrets.yaml' file.\n\n`;

      throw Error(errorMessage);
    }

    setEnvironmentProperty(AWS_ACCESS_KEY_ID_ENV_VARIABLE, awsAccessKeyId);
    setEnvironmentProperty(AWS_SECRET_ACCESS_KEY_ENV_VARIABLE, awsSecretAccessKey);
  }
  else {
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