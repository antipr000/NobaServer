import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalFailedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";

export class SendWithdrawalFailedEvent {
  email: string;
  name: string;
  handle: string;
  params: WithdrawalFailedNotificationParameters;
  pushTokens: string[];
  locale?: string;
}

export const validateWithdrawalFailedEvent = (event: SendWithdrawalFailedEvent) => {
  const withdrawalFailedEventJoiValidationKeys = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getWithdrawalFailedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const withdrawalFailedEventJoiSchema = Joi.object(withdrawalFailedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalFailedEventJoiSchema);
};
