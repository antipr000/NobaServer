import Joi from "joi";
import { BaseEvent } from "./BaseEvent";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendInviteEmployeeEvent extends BaseEvent {
  companyName: string;
  inviteUrl: string;
  employeeID: string;
}

export const validateSendInviteEmployeeEvent = (event: SendInviteEmployeeEvent) => {
  const sendInviteEmployeeEventJoiValidationKeys: KeysRequired<SendInviteEmployeeEvent> = {
    companyName: Joi.string().required(),
    inviteUrl: Joi.string().required(),
    employeeID: Joi.string().required(),
    email: Joi.string().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const sendInviteEmployeeEventJoiSchema = Joi.object(sendInviteEmployeeEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendInviteEmployeeEventJoiSchema);
};
