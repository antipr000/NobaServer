import {
  CIRCLE_API_KEY,
  CIRCLE_AWS_SECRET_KEY_FOR_API_KEY,
  CIRCLE_AWS_SECRET_KEY_FOR_MASTER_WALLET_ID,
  CIRCLE_ENVIRONMENT,
  CIRCLE_MASTER_WALLET_ID,
} from "../ConfigurationUtils";
import { CircleEnvironments } from "@circle-fin/circle-sdk";

export interface CircleConfigs {
  [CIRCLE_API_KEY]: string;
  [CIRCLE_AWS_SECRET_KEY_FOR_API_KEY]: string;
  [CIRCLE_ENVIRONMENT]: string;
  [CIRCLE_MASTER_WALLET_ID]: string;
  [CIRCLE_AWS_SECRET_KEY_FOR_MASTER_WALLET_ID]: string;
}

export function isValidCircleEnvironment(env: string): boolean {
  const validEnvironments: string[] = Object.keys(CircleEnvironments);
  return validEnvironments.find(value => value === env) !== undefined;
}
