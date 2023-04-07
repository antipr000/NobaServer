import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendKycPendingOrFlaggedEvent {
  email: string;
  firstName?: string;
  lastName?: string;
  nobaUserID: string;
  locale?: string;
}

export const validateSendKycPendingOrFlaggedEvent = (event: SendKycPendingOrFlaggedEvent) => {
  const sendKycPendingOrFlaggedEventJoiValidationKeys: KeysRequired<SendKycPendingOrFlaggedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendKycPendingOrFlaggedEventJoiSchema = Joi.object(sendKycPendingOrFlaggedEventJoiValidationKeys);

  Joi.attempt(event, sendKycPendingOrFlaggedEventJoiSchema);
};
