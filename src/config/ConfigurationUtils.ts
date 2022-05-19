import * as Joi from "joi";
import { SecretProvider } from "./SecretProvider";


export enum AppEnvironment {
    DEV = "development",
    PROD = "production",
    STAGING = "staging"
}

export const NODE_ENV_CONFIG_KEY = "NODE_ENV";
export const REDIS_CONFIG_CONFIG_KEY = "redis"
export const SES_CONFIG_KEY = "ses";
export const S3_CONFIG_KEY = "s3";

export const SERVER_LOG_FILE_PATH = "logFilePath";

export const AWS_ACCESS_KEY_ID_ATTR = "awsAccessKeyId";
export const AWS_SECRET_ACCESS_KEY_ATTR = "awsSecretAccessKey";
export const AWS_DEFAULT_REGION_ATTR = "awsDefaultRegion";
export const AWS_REGION_ATTR = "awsRegion";
export const AWS_ACCESS_KEY_ID_ENV_VARIABLE = "AWS_ACCESS_KEY_ID";
export const AWS_SECRET_ACCESS_KEY_ENV_VARIABLE = "AWS_SECRET_ACCESS_KEY";
export const AWS_REGION_ENV_VARIABLE = "AWS_REGION";
export const AWS_DEFAULT_REGION_ENV_VARIABLE = "AWS_DEFAULT_REGION";

export const STRIPE_CONFIG_KEY = "stripe";
export const STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR = "awsSecretNameForSecretKey";
export const STRIPE_SECRET_KEY = "secretKey";

export const TWILIO_CONFIG_KEY = "twilio";
export const TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR = "awsSecretNameForSID";
export const TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR = "awsSecretNameForAuthToken";
export const TWILIO_SID = "SID";
export const TWILIO_AUTH_TOKEN = "authToken";
export const TWILIO_FROM_PHONE_NUMBER = "fromPhoneNumber";

export const TRULIOO_CONFIG_KEY = "trulioo";
export const TRULIOO_AWS_SECRET_KEY_FOR_IDV_ATTR = "awsSecretNameForIDVApiKey";
export const TRULIOO_AWS_SECRET_KEY_FOR_DOCV_API_KEY_ATTR = "awsSecretNameForDocVApiKey";
export const TRULIOO_IDV = "TruliooIDVApiKey";
export const TRULIOO_DOCV_API_KEY = "TruliooDocVApiKey";

export const SENDGRID_CONFIG_KEY = "sendgrid";
export const SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR = "awsSecretNameForApiKey";
export const SENDGRID_API_KEY = "apiKey";

export const appConfigsJoiValidationSchema = Joi.object({
    [AWS_REGION_ATTR]: Joi.string().required(),
    [AWS_DEFAULT_REGION_ATTR]: Joi.string().required(),
    [NODE_ENV_CONFIG_KEY]: Joi.string().default(AppEnvironment.DEV),
    logFilePath: Joi.string().required()
}).options({ allowUnknown: true });

export function getEnvironmentName(): AppEnvironment {
    const envType: any = getPropertyFromEvironment(NODE_ENV_CONFIG_KEY);
    if (!envType) throw new Error("Expect NODE_ENV environment variable to be present in the environment");
    if (!Object.values(AppEnvironment).includes(envType)) {
        throw new Error("NODE_ENV should be one of " + Object.values(AppEnvironment).join(","));
    }
    return envType as AppEnvironment;
}

export function getPropertyFromEvironment(key: string) {
    return process.env[key];
}

export function isPropertyPresentInEnvironmentVariables(key: string): boolean {
    const value = getPropertyFromEvironment(key);
    if (value === '' || value === undefined || value === null) return false;
    return true;
}

export function resetPropertyFromEnvironment(key: string): void {
    delete process.env[key];
}

export function setEnvironmentProperty(key: string, value: string): void {
    process.env[key] = value;
}

export async function getParameterValue(awsSecretKey: string, customValue: string): Promise<string> {
    if (awsSecretKey === undefined || awsSecretKey === "") return customValue;
    return SecretProvider.fetchSecretFromAWSSecretManager(awsSecretKey);
}