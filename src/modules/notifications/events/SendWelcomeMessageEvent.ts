import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendWelcomeMessageEvent {
  email: string;
  firstName: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateSendWelcomeMessageEvent = (event: SendWelcomeMessageEvent) => {
  const sendWelcomeMessageEventJoiValidationKeys: KeysRequired<SendWelcomeMessageEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendWelcomeMessageEventJoiSchema = Joi.object(sendWelcomeMessageEventJoiValidationKeys);

  Joi.attempt(event, sendWelcomeMessageEventJoiSchema);
};
