import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendKycPendingOrFlaggedEvent extends BaseEvent {}

export const validateSendKycPendingOrFlaggedEvent = (event: SendKycPendingOrFlaggedEvent) => {
  const sendKycPendingOrFlaggedEventJoiValidationKeys: KeysRequired<SendKycPendingOrFlaggedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const sendKycPendingOrFlaggedEventJoiSchema = Joi.object(sendKycPendingOrFlaggedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendKycPendingOrFlaggedEventJoiSchema);
};
