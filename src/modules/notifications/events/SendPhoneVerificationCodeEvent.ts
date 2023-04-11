import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendPhoneVerificationCodeEvent extends BaseEvent {
  otp: string;
}

export const validateSendPhoneVerificationCodeEvent = (event: SendPhoneVerificationCodeEvent) => {
  const sendPhoneVerificationCodeEventJoiValidationKeys: KeysRequired<SendPhoneVerificationCodeEvent> = {
    phone: Joi.string().required(),
    otp: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    locale: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
    email: Joi.string().email().optional(),
  };

  const sendPhoneVerificationCodeEventJoiSchema = Joi.object(sendPhoneVerificationCodeEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendPhoneVerificationCodeEventJoiSchema);
};
