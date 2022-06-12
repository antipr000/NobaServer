import { STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR, STRIPE_SECRET_KEY } from "../ConfigurationUtils";

export interface StripeConfigs {
  [STRIPE_SECRET_KEY]: string;
  [STRIPE_AWS_SECRET_KEY_FOR_SECRET_KEY_ATTR]: string;
}
