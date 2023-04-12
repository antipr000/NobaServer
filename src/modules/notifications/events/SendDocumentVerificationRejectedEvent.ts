import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDocumentVerificationRejectedEvent extends BaseEvent {}

export const validateDocumentVerificationRejectedEvent = (event: SendDocumentVerificationRejectedEvent) => {
  const documentVerificationRejectedEventJoiValidationKeys: KeysRequired<SendDocumentVerificationRejectedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const documentVerificationRejectedEventJoiSchema = Joi.object(
    documentVerificationRejectedEventJoiValidationKeys,
  ).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, documentVerificationRejectedEventJoiSchema);
};
