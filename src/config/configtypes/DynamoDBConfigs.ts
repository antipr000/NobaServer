import * as Joi from "joi";
import { KeysRequired } from "src/modules/common/domain/Types";
import { APP_CONSTANTS } from "../AppConstants";

export const DDB_ACCESS_KEY_ID_ATTR = APP_CONSTANTS.AWS_ACCESS_KEY_ID_ATTR; //for now using common credentials across all aws infra providers as being accessed in same ec2 instance
export const DDB_SECRET_KEY_ATTR = APP_CONSTANTS.AWS_SECRET_ACCESS_KEY_ATTR; //for now using common credentials across all aws infra providers as being accessed in same ec2 instance

export interface DynamoDBConfigs {
  endpoint: string;
  awsRegion: string;
  logQueries: boolean;
}

export const ddbConfigsJoiValidationSchema: KeysRequired<DynamoDBConfigs> = {
  endpoint: Joi.string().required(),
  awsRegion: Joi.string().required(),
  logQueries: Joi.boolean().default(false),
};
