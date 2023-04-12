import Joi from "joi";
import { BaseEvent } from "./BaseEvent";

export class SendWelcomeMessageEvent extends BaseEvent {}

export const validateSendWelcomeMessageEvent = (event: SendWelcomeMessageEvent) => {
  const sendWelcomeMessageEventJoiValidationKeys = {
    email: Joi.string().email().required(),
  };

  const sendWelcomeMessageEventJoiSchema = Joi.object(sendWelcomeMessageEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendWelcomeMessageEventJoiSchema);
};
