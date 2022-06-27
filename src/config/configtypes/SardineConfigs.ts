import {
  SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR,
  SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR,
  SARDINE_CLIENT_ID,
  SARDINE_SECRET_KEY,
  SARDINE_URI,
} from "../ConfigurationUtils";

export interface SardineConfigs {
  [SARDINE_AWS_SECRET_KEY_FOR_SARDINE_CLIENT_ID_ATTR]: string;
  [SARDINE_AWS_SECRET_KEY_FOR_SARDINE_SECRET_KEY_ATTR]: string;
  [SARDINE_CLIENT_ID]: string;
  [SARDINE_SECRET_KEY]: string;
  [SARDINE_URI]: string;
}
