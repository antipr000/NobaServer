import * as Joi from 'joi';
import { join, dirname } from 'path';
import { readConfigsFromYamlFiles } from '../core/utils/YamlJsonUtils';
import { appConfigsJoiValidationSchema, AppEnvironment,  getEnvironmentName } from './ConfigurationUtils';
import { SecretProvider } from './SecretProvider';



const envNameToPropertyFileNameMap = {
  [AppEnvironment.DEV] : "localdevelopment.yaml",
  [AppEnvironment.PROD] : "production.yaml",
  [AppEnvironment.STAGING] : "staging.yaml"
} as const;


export default function loadAppConfigs(){

  // *** Application configurations loading logic here ***

  const environment: AppEnvironment = getEnvironmentName();
  const configFileName = envNameToPropertyFileNameMap[environment]; 
  
  // if custom path not given then look for the configs in the dist folder, __dirname will resolve to dist folder as this file will in main.js generated javascript file
  // and we putting configs directory in dist folder see nest-cli.json file
  const configsDir = process.env["CONFIGS_DIR"] ?? join(__dirname, "appconfigs"); 

  //comma separated list of absolute paths to override config files which can be used to override configs from main property file, file coming in the last overrides previous files
  const overrideFilesPaths = process.env["CONFIGS_OVERRIDE_FILES"]?.split(",") ?? []; 

  const mainPropertyFile = join(configsDir, configFileName);

  console.log(`Configs directory is ${configsDir} and config file name is ${configFileName}`); 
  console.log(`Override files are ${overrideFilesPaths}`);

  let configs =  readConfigsFromYamlFiles(mainPropertyFile, ...overrideFilesPaths);
  configs = SecretProvider.setSecretsInConfigs(configs);

  //merge configs with override files

  //TODO if needed merge configs here with environment variable configs (some variables may be coming from secrets manager)
  
  const finalConfigs = Joi.attempt(configs, appConfigsJoiValidationSchema); //validate configs

  setEnvVariables(finalConfigs);

  return finalConfigs; 
};





function setEnvVariables(finalConfigs: Record<string, any>): void
{
   //setting up aws creds in env variable, this may not be the best place

   process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? finalConfigs["awsCommonAccessKeyID"]
   process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? finalConfigs["awsCommonAccessKeySecret"];
   process.env.AWS_REGION = process.env.AWS_REGION ?? finalConfigs["awsCommonRegion"];
   process.env.AWS_DEFAULT_REGION = process.env.AWS_REGION;
}

