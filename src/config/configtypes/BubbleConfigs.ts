import {
  BUBBLE_AWS_SECRET_KEY_FOR_BASE_URL,
  BUBBLE_AWS_SECRET_KEY_FOR_BEARER_TOKEN,
  BUBBLE_BASE_URL,
  BUBBLE_BEARER_TOKEN,
} from "../ConfigurationUtils";

export interface BubbleConfigs {
  [BUBBLE_BASE_URL]: string;
  [BUBBLE_BEARER_TOKEN]: string;
  [BUBBLE_AWS_SECRET_KEY_FOR_BASE_URL]: string;
  [BUBBLE_AWS_SECRET_KEY_FOR_BEARER_TOKEN]: string;
}
