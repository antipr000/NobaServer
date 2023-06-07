import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendScheduledReminderEvent extends BaseEvent {
  eventID: string;
}

export const validateSendScheduledReminderEvent = (event: SendScheduledReminderEvent) => {
  const sendScheduledReminderEventJoiValidationKeys: KeysRequired<SendScheduledReminderEvent> = {
    email: Joi.string().email().optional().allow(null),
    firstName: Joi.string().optional().allow(null),
    lastName: Joi.string().optional().allow(null),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional().allow(null),
    phone: Joi.string().optional().allow(null),
    handle: Joi.string().optional().allow(null),
    eventID: Joi.string().required(),
  };

  const sendScheduledReminderEventJoiSchema = Joi.object(sendScheduledReminderEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendScheduledReminderEventJoiSchema);
};
