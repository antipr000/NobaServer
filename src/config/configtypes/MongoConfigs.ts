import { MONGO_AWS_SECRET_KEY_FOR_URI_ATTR, MONGO_URI } from "../ConfigurationUtils";

export interface MongoConfigs {
  [MONGO_URI]: string;
  [MONGO_AWS_SECRET_KEY_FOR_URI_ATTR]: string;
}
