import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDocumentVerificationPendingEvent extends BaseEvent {}

export const validateDocumentVerificationPendingEvent = (event: SendDocumentVerificationPendingEvent) => {
  const documentVerificationPendingEventJoiValidationKeys: KeysRequired<SendDocumentVerificationPendingEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const documentVerificationPendingEventJoiSchema = Joi.object(
    documentVerificationPendingEventJoiValidationKeys,
  ).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, documentVerificationPendingEventJoiSchema);
};
