import { DEPENDENCY_EMAIL_CLIENT, DEPENDENCY_SMS_CLIENT } from "../ConfigurationUtils";

export interface DependencyConfigs {
  [DEPENDENCY_EMAIL_CLIENT]: EmailClient;
  [DEPENDENCY_SMS_CLIENT]: SMSClient;
}

export enum EmailClient {
  STUB = "STUB",
  SENDGRID = "SENDGRID",
}

export enum SMSClient {
  STUB = "STUB",
  TWILIO = "TWILIO",
}
