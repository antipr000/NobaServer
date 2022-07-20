import {
  AWS_SECRET_KEY_FOR_FOLLOW_UP_KEY_KMS_ARN,
  AWS_SECRET_KEY_FOR_GENERATOR_KEY_KMS_ARN,
  FOLLOW_UP_KEY_KMS_ARN,
  GENERATOR_KEY_KMS_ARN,
  KMS_CONFIG_CONTEXT_KEY,
  KMS_CONTEXT_ORIGIN,
  KMS_CONTEXT_PURPOSE,
  KMS_CONTEXT_STAGE,
  KMS_SSN_CONFIG_KEY,
} from "../ConfigurationUtils";

export interface KmsConfigs {
  [KMS_CONFIG_CONTEXT_KEY]: CustomKmsEncryptionContext;
  [KMS_SSN_CONFIG_KEY]: KmsSingleKeyConfigs;
}

export interface CustomKmsEncryptionContext {
  [KMS_CONTEXT_STAGE]: string;
  [KMS_CONTEXT_PURPOSE]: string;
  [KMS_CONTEXT_ORIGIN]: string;
}

export interface KmsSingleKeyConfigs {
  [GENERATOR_KEY_KMS_ARN]: string;
  [AWS_SECRET_KEY_FOR_GENERATOR_KEY_KMS_ARN]: string;
  [FOLLOW_UP_KEY_KMS_ARN]: string;
  [AWS_SECRET_KEY_FOR_FOLLOW_UP_KEY_KMS_ARN]: string;
}

export enum KmsKeyType {
  SSN,
}
