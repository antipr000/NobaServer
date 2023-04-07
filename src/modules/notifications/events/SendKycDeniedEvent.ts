import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendKycDeniedEvent {
  email: string;
  firstName?: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateSendKycDeniedEvent = (event: SendKycDeniedEvent) => {
  const sendKycDeniedEventJoiValidationKeys: KeysRequired<SendKycDeniedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendKycDeniedEventJoiSchema = Joi.object(sendKycDeniedEventJoiValidationKeys);

  Joi.attempt(event, sendKycDeniedEventJoiSchema);
};
