import {
  KMS_CONFIG_CONTEXT_KEY,
  KMS_CONTEXT_ORIGIN,
  KMS_CONTEXT_PURPOSE,
  KMS_CONTEXT_STAGE,
} from "../ConfigurationUtils";

export interface KmsConfigs {
  [KMS_CONFIG_CONTEXT_KEY]: CustomKmsEncryptionContext;
}

export interface CustomKmsEncryptionContext {
  [KMS_CONTEXT_STAGE]: string;
  [KMS_CONTEXT_PURPOSE]: string;
  [KMS_CONTEXT_ORIGIN]: string;
}
