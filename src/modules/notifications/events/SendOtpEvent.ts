import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendOtpEvent {
  email?: string;
  phone?: string;
  otp: string;
  name?: string;
  handle?: string;
  locale?: string;
}

export const validateSendOtpEvent = (event: SendOtpEvent) => {
  const sendOtpEventJoiValidationKeys: KeysRequired<SendOtpEvent> = {
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    otp: Joi.string().required(),
    name: Joi.string().optional(),
    handle: Joi.string().optional(),
    locale: Joi.string().optional(),
  };

  const sendOtpEventJoiSchema = Joi.object(sendOtpEventJoiValidationKeys);

  Joi.attempt(event, sendOtpEventJoiSchema);
};
