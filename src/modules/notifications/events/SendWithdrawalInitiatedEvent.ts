import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalIntiatedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";

export class SendWithdrawalInitiatedEvent {
  email: string;
  name: string;
  handle: string;
  params: WithdrawalIntiatedNotificationParameters;
  locale?: string;
}

export const validateWithdrawalInitiatedEvent = (event: SendWithdrawalInitiatedEvent) => {
  const withdrawalInitiatedEventJoiValidationKeys = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getWithdrawalIntiatedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
  };

  const withdrawalInitiatedEventJoiSchema = Joi.object(withdrawalInitiatedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalInitiatedEventJoiSchema);
};
