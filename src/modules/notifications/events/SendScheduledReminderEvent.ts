import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendScheduledReminderEvent extends BaseEvent {
  eventID: string;
}

export const validateSendScheduledReminderEvent = (event: SendScheduledReminderEvent) => {
  const sendScheduledReminderEventJoiValidationKeys: KeysRequired<SendScheduledReminderEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
    eventID: Joi.string().required(),
  };

  const sendScheduledReminderEventJoiSchema = Joi.object(sendScheduledReminderEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendScheduledReminderEventJoiSchema);
};
