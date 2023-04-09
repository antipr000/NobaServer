import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDocumentVerificationPendingEvent extends BaseEvent {}

export const validateDocumentVerificationPendingEvent = (event: SendDocumentVerificationPendingEvent) => {
  const documentVerificationPendingEventJoiValidationKeys: KeysRequired<SendDocumentVerificationPendingEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
  };

  const documentVerificationPendingEventJoiSchema = Joi.object(documentVerificationPendingEventJoiValidationKeys);

  Joi.attempt(event, documentVerificationPendingEventJoiSchema);
};
