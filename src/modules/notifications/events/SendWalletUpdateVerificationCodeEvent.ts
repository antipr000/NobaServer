import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendWalletUpdateVerificationCodeEvent extends BaseEvent {
  otp: string;
  walletAddress: string;
}

export const validateSendWalletUpdateVerificationCodeEvent = (event: SendWalletUpdateVerificationCodeEvent) => {
  const sendWalletUpdateVerificationCodeEventJoiValidationKeys: KeysRequired<SendWalletUpdateVerificationCodeEvent> = {
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    otp: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    walletAddress: Joi.string().required(),
    handle: Joi.string().optional(),
  };

  const sendWalletUpdateVerificationCodeEventJoiSchema = Joi.object(
    sendWalletUpdateVerificationCodeEventJoiValidationKeys,
  ).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendWalletUpdateVerificationCodeEventJoiSchema);
};
