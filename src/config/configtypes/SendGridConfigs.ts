import { SENDGRID_API_KEY, SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR } from "../ConfigurationUtils";

export interface SendGridConfigs {
  [SENDGRID_API_KEY]: string;
  [SENDGRID_AWS_SECRET_KEY_FOR_API_KEY_ATTR]: string;
}
