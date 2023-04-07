import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDocumentVerificationRejectedEvent {
  email: string;
  firstName: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateDocumentVerificationRejectedEvent = (event: SendDocumentVerificationRejectedEvent) => {
  const documentVerificationRejectedEventJoiValidationKeys: KeysRequired<SendDocumentVerificationRejectedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const documentVerificationRejectedEventJoiSchema = Joi.object(documentVerificationRejectedEventJoiValidationKeys);

  Joi.attempt(event, documentVerificationRejectedEventJoiSchema);
};
