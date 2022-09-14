import { ELLIPTIC_API_KEY, ELLIPTIC_AWS_SECRET_KEY_FOR_API_KEY_ATTR, ELLIPTIC_BASE_URL } from "../ConfigurationUtils";

export interface EllipticConfigs {
  [ELLIPTIC_API_KEY]: string;
  [ELLIPTIC_AWS_SECRET_KEY_FOR_API_KEY_ATTR]: string;
  [ELLIPTIC_BASE_URL]: string;
}
