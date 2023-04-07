import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendRegisterNewEmployeeEvent {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  employerReferralID: string;
  allocationAmountInPesos: number;
  nobaEmployeeID: string;
  locale?: string;
}

export const validateSendRegisterNewEmployeeEvent = (event: SendRegisterNewEmployeeEvent) => {
  const sendRegisterNewEmployeeEventJoiValidationKeys: KeysRequired<SendRegisterNewEmployeeEvent> = {
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    employerReferralID: Joi.string().required(),
    allocationAmountInPesos: Joi.number().required(),
    nobaEmployeeID: Joi.string().required(),
    locale: Joi.string().optional(),
  };

  const sendRegisterNewEmployeeEventJoiSchema = Joi.object(sendRegisterNewEmployeeEventJoiValidationKeys);

  Joi.attempt(event, sendRegisterNewEmployeeEventJoiSchema);
};
