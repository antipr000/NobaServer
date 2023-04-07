import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendKycApprovedUSEvent {
  email: string;
  firstName?: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateSendKycApprovedUSEvent = (event: SendKycApprovedUSEvent) => {
  const sendKycApprovedUSEventJoiValidationKeys: KeysRequired<SendKycApprovedUSEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendKycApprovedUSEventJoiSchema = Joi.object(sendKycApprovedUSEventJoiValidationKeys);

  Joi.attempt(event, sendKycApprovedUSEventJoiSchema);
};
