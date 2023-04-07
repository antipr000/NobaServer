import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalCompletedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";

export class SendWithdrawalCompletedEvent {
  email: string;
  name: string;
  handle: string;
  params: WithdrawalCompletedNotificationParameters;
  pushTokens: string[];
  locale?: string;
}

export const validateWithdrawalCompletedEvent = (event: SendWithdrawalCompletedEvent) => {
  const withdrawalCompletedEventJoiValidationKeys = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getWithdrawalCompletedNotificationParamsSchema(),
    ).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const withdrawalCompletedEventJoiSchema = Joi.object(withdrawalCompletedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalCompletedEventJoiSchema);
};
