import * as Joi from "joi";
import { ddbConfigsJoiValidationSchema } from "./configtypes/DynamoDBConfigs";
import { SecretProvider } from "./SecretProvider";

export enum AppEnvironment {
    DEV = "development",
    PROD = "production",
    STAGING = "staging"
}

export const NODE_ENV_CONFIG_KEY = "NODE_ENV";
export const DDB_CONFIG_KEY = "dynamodb";
export const REDIS_CONFIG_CONFIG_KEY = "redis"
export const SES_CONFIG_KEY = "ses";
export const S3_CONFIG_KEY = "s3";
export const STRIPE_CONFIG_KEY = "stripe";
export const SENDGRID_CONFIG_KEY = "sendgrid";
export const TRULIOO_CONFIG_KEY = "trulioo";


export const appConfigsJoiValidationSchema = Joi.object({
    awsCommonRegion: Joi.string().required(),
    awsCommonAccessKeyID: Joi.string().required(),
    awsCommonAccessKeySecret: Joi.string().required(),
    [NODE_ENV_CONFIG_KEY]: Joi.string().default(AppEnvironment.DEV), 
    [DDB_CONFIG_KEY]: ddbConfigsJoiValidationSchema,
    //TODO add schema for other configs too
    //TODO add others
}).options({allowUnknown: true});


export function getEnvironmentName(): AppEnvironment {
    const envType: any = getPropertyFromEvironment(NODE_ENV_CONFIG_KEY);
    if(!envType) throw new Error("Expect NODE_ENV environment variable to be present in the environment");
    if(!Object.values(AppEnvironment).includes(envType)) {
        throw new Error("NODE_ENV should be one of "+Object.values(AppEnvironment).join(","));
    } 
    return envType as AppEnvironment; 
}

export function getPropertyFromEvironment(key: string) {
    return process.env[key];
}

//first checks for a property from environment else loads from secrets
export function loadFromEvironmentOrSecret(key: string): string {
    const fromEnv = getPropertyFromEvironment(key);
    if(fromEnv) {
        return fromEnv;
    }else {//only load from secrets if not present in environment
        return SecretProvider.getSecret(key);
    }
}