import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendUpdatePayrollStatusEvent {
  nobaPayrollID: string;
  payrollStatus: PayrollStatus;
}

export const validateSendUpdatePayrollStatusEvent = (event: SendUpdatePayrollStatusEvent) => {
  const sendUpdatePayrollStatusEventJoiValidationKeys: KeysRequired<SendUpdatePayrollStatusEvent> = {
    nobaPayrollID: Joi.string().required(),
    payrollStatus: Joi.string().required(),
  };

  const sendUpdatePayrollStatusEventJoiSchema = Joi.object(sendUpdatePayrollStatusEventJoiValidationKeys);

  Joi.attempt(event, sendUpdatePayrollStatusEventJoiSchema);
};
