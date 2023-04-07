import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendKycApprovedNonUSEvent {
  email: string;
  firstName?: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateSendKycApprovedNonUSEvent = (event: SendKycApprovedNonUSEvent) => {
  const sendKycApprovedNonUSEventJoiValidationKeys: KeysRequired<SendKycApprovedNonUSEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendKycApprovedNonUSEventJoiSchema = Joi.object(sendKycApprovedNonUSEventJoiValidationKeys);

  Joi.attempt(event, sendKycApprovedNonUSEventJoiSchema);
};
