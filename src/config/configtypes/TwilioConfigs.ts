import {
  TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR,
  TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR,
  TWILIO_FROM_PHONE_NUMBER,
  TWILIO_AUTH_TOKEN,
  TWILIO_SID,
} from "../ConfigurationUtils";

export interface TwilioConfigs {
  [TWILIO_AWS_SECRET_KEY_FOR_SID_ATTR]: string;
  [TWILIO_AWS_SECRET_KEY_FOR_AUTH_TOKEN_ATTR]: string;
  [TWILIO_SID]: string;
  [TWILIO_AUTH_TOKEN]: string;
  [TWILIO_FROM_PHONE_NUMBER]: string;
}
