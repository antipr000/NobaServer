import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendWelcomeMessageEvent extends BaseEvent {}

export const validateSendWelcomeMessageEvent = (event: SendWelcomeMessageEvent) => {
  const sendWelcomeMessageEventJoiValidationKeys: KeysRequired<SendWelcomeMessageEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const sendWelcomeMessageEventJoiSchema = Joi.object(sendWelcomeMessageEventJoiValidationKeys);

  Joi.attempt(event, sendWelcomeMessageEventJoiSchema);
};
