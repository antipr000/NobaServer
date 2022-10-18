import {
  PLAID_AWS_SECRET_KEY_FOR_CLIENT_ID,
  PLAID_AWS_SECRET_KEY_FOR_REDIRECT_URI,
  PLAID_AWS_SECRET_KEY_FOR_SECRET_KEY,
  PLAID_CLIENT_ID,
  PLAID_ENVIRONMENT,
  PLAID_REDIRECT_URI,
  PLAID_SECRET_KEY,
  PLAID_VERSION,
} from "../ConfigurationUtils";

export interface PlaidConfigs {
  [PLAID_ENVIRONMENT]: string;
  [PLAID_VERSION]: string;

  [PLAID_CLIENT_ID]: string;
  [PLAID_AWS_SECRET_KEY_FOR_CLIENT_ID]: string;

  [PLAID_SECRET_KEY]: string;
  [PLAID_AWS_SECRET_KEY_FOR_SECRET_KEY]: string;

  [PLAID_REDIRECT_URI]: string;
  [PLAID_AWS_SECRET_KEY_FOR_REDIRECT_URI]: string;
}
