import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDocumentVerificationTechnicalFailureEvent {
  email: string;
  firstName: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateDocumentVerificationTechnicalFailureEvent = (
  event: SendDocumentVerificationTechnicalFailureEvent,
) => {
  const documentVerificationTechnicalFailureEventJoiValidationKeys: KeysRequired<SendDocumentVerificationTechnicalFailureEvent> =
    {
      email: Joi.string().email().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().optional(),
      nobaUserID: Joi.string().required(),
      locale: Joi.string().optional(),
    };

  const documentVerificationTechnicalFailureEventJoiSchema = Joi.object(
    documentVerificationTechnicalFailureEventJoiValidationKeys,
  );

  Joi.attempt(event, documentVerificationTechnicalFailureEventJoiSchema);
};
