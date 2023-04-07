import {
  PayrollDepositCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendPayrollDepositCompletedEvent {
  email: string;
  name: string;
  handle: string;
  params: PayrollDepositCompletedNotificationParameters;
  pushTokens?: string[];
  locale?: string;
}

export const validatePayrollDepositCompletedEvent = (event: SendPayrollDepositCompletedEvent) => {
  const payrollDepositCompletedEventJoiValidationKeys: KeysRequired<SendPayrollDepositCompletedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getPayrollDepositCompletedNotificationParamsSchema(),
    ).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const payrollDepositCompletedEventJoiSchema = Joi.object(payrollDepositCompletedEventJoiValidationKeys);

  Joi.attempt(event, payrollDepositCompletedEventJoiSchema);
};
