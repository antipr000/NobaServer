import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendRegisterNewEmployeeEvent extends BaseEvent {
  employerReferralID: string;
  allocationAmountInPesos: number;
  nobaEmployeeID: string;
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
    handle: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const sendRegisterNewEmployeeEventJoiSchema = Joi.object(sendRegisterNewEmployeeEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendRegisterNewEmployeeEventJoiSchema);
};
