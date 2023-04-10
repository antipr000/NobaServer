import {
  PayrollDepositCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendPayrollDepositCompletedEvent extends BaseEvent {
  params: PayrollDepositCompletedNotificationParameters;
}

export const validatePayrollDepositCompletedEvent = (event: SendPayrollDepositCompletedEvent) => {
  const payrollDepositCompletedEventJoiValidationKeys: KeysRequired<SendPayrollDepositCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getPayrollDepositCompletedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
  };

  const payrollDepositCompletedEventJoiSchema = Joi.object(payrollDepositCompletedEventJoiValidationKeys);

  Joi.attempt(event, payrollDepositCompletedEventJoiSchema);
};
