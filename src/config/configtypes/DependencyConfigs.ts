import { DEPENDENCY_EMAIL_CLIENT } from "../ConfigurationUtils";

export interface DependencyConfigs {
  [DEPENDENCY_EMAIL_CLIENT]: EmailClient;
}

export enum EmailClient {
  FAKE = "FAKE",
  SENDGRID = "SENDGRID",
}
