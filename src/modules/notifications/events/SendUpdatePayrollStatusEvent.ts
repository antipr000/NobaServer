import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import Joi from "joi";
import { BaseEvent } from "./BaseEvent";

export class SendUpdatePayrollStatusEvent extends BaseEvent {
  nobaPayrollID: string;
  payrollStatus: PayrollStatus;
}

export const validateSendUpdatePayrollStatusEvent = (event: SendUpdatePayrollStatusEvent) => {
  const sendUpdatePayrollStatusEventJoiValidationKeys = {
    nobaPayrollID: Joi.string().required(),
    payrollStatus: Joi.string().required(),
  };

  const sendUpdatePayrollStatusEventJoiSchema = Joi.object(sendUpdatePayrollStatusEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendUpdatePayrollStatusEventJoiSchema);
};
