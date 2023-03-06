import { DEPENDENCY_DASHBOARD_CLIENT, DEPENDENCY_EMAIL_CLIENT, DEPENDENCY_SMS_CLIENT } from "../ConfigurationUtils";

export interface DependencyConfigs {
  [DEPENDENCY_EMAIL_CLIENT]: EmailClient;
  [DEPENDENCY_SMS_CLIENT]: SMSClient;
  [DEPENDENCY_DASHBOARD_CLIENT]: DashboardClient;
}

export enum EmailClient {
  STUB = "STUB",
  SENDGRID = "SENDGRID",
}

export enum SMSClient {
  STUB = "STUB",
  TWILIO = "TWILIO",
}

export enum DashboardClient {
  STUB = "STUB",
  BUBBLE = "BUBBLE",
}
