import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDocumentVerificationPendingEvent {
  email: string;
  firstName: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateDocumentVerificationPendingEvent = (event: SendDocumentVerificationPendingEvent) => {
  const documentVerificationPendingEventJoiValidationKeys: KeysRequired<SendDocumentVerificationPendingEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const documentVerificationPendingEventJoiSchema = Joi.object(documentVerificationPendingEventJoiValidationKeys);

  Joi.attempt(event, documentVerificationPendingEventJoiSchema);
};
