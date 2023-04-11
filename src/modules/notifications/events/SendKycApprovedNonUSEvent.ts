import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendKycApprovedNonUSEvent extends BaseEvent {}

export const validateSendKycApprovedNonUSEvent = (event: SendKycApprovedNonUSEvent) => {
  const sendKycApprovedNonUSEventJoiValidationKeys: KeysRequired<SendKycApprovedNonUSEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const sendKycApprovedNonUSEventJoiSchema = Joi.object(sendKycApprovedNonUSEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendKycApprovedNonUSEventJoiSchema);
};
