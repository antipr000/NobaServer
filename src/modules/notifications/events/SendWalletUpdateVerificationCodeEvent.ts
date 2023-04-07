import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendWalletUpdateVerificationCodeEvent {
  email?: string;
  phone?: string;
  otp: string;
  name: string;
  nobaUserID: string;
  locale?: string;
  walletAddress: string;
}

export const validateSendWalletUpdateVerificationCodeEvent = (event: SendWalletUpdateVerificationCodeEvent) => {
  const sendWalletUpdateVerificationCodeEventJoiValidationKeys: KeysRequired<SendWalletUpdateVerificationCodeEvent> = {
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    otp: Joi.string().required(),
    name: Joi.string().required(),
    nobaUserID: Joi.string().required(),
    locale: Joi.string().optional(),
    walletAddress: Joi.string().required(),
  };

  const sendWalletUpdateVerificationCodeEventJoiSchema = Joi.object(
    sendWalletUpdateVerificationCodeEventJoiValidationKeys,
  );

  Joi.attempt(event, sendWalletUpdateVerificationCodeEventJoiSchema);
};
