import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDocumentVerificationTechnicalFailureEvent extends BaseEvent {}

export const validateDocumentVerificationTechnicalFailureEvent = (
  event: SendDocumentVerificationTechnicalFailureEvent,
) => {
  const documentVerificationTechnicalFailureEventJoiValidationKeys: KeysRequired<SendDocumentVerificationTechnicalFailureEvent> =
    {
      email: Joi.string().email().required(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      nobaUserID: Joi.string().required(),
      locale: Joi.string().optional(),
      phone: Joi.string().optional(),
      handle: Joi.string().optional(),
    };

  const documentVerificationTechnicalFailureEventJoiSchema = Joi.object(
    documentVerificationTechnicalFailureEventJoiValidationKeys,
  ).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, documentVerificationTechnicalFailureEventJoiSchema);
};
