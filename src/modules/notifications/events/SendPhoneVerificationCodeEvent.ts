import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendPhoneVerificationCodeEvent {
  phone: string;
  otp: string;
  name: string;
  handle: string;
  locale?: string;
}

export const validateSendPhoneVerificationCodeEvent = (event: SendPhoneVerificationCodeEvent) => {
  const sendPhoneVerificationCodeEventJoiValidationKeys: KeysRequired<SendPhoneVerificationCodeEvent> = {
    phone: Joi.string().required(),
    otp: Joi.string().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendPhoneVerificationCodeEventJoiSchema = Joi.object(sendPhoneVerificationCodeEventJoiValidationKeys);

  Joi.attempt(event, sendPhoneVerificationCodeEventJoiSchema);
};
