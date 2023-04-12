import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendOtpEvent extends BaseEvent {
  otp: string;
}

export const validateSendOtpEvent = (event: SendOtpEvent) => {
  const sendOtpEventJoiValidationKeys: KeysRequired<SendOtpEvent> = {
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    otp: Joi.string().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().optional(),
    locale: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const sendOtpEventJoiSchema = Joi.object(sendOtpEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendOtpEventJoiSchema);
};
