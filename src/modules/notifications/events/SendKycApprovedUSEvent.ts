import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendKycApprovedUSEvent extends BaseEvent {}

export const validateSendKycApprovedUSEvent = (event: SendKycApprovedUSEvent) => {
  const sendKycApprovedUSEventJoiValidationKeys: KeysRequired<SendKycApprovedUSEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const sendKycApprovedUSEventJoiSchema = Joi.object(sendKycApprovedUSEventJoiValidationKeys);

  Joi.attempt(event, sendKycApprovedUSEventJoiSchema);
};
