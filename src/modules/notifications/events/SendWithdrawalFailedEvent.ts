import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalFailedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { BaseEvent } from "./BaseEvent";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendWithdrawalFailedEvent extends BaseEvent {
  params: WithdrawalFailedNotificationParameters;
  pushTokens?: string[];
}

export const validateWithdrawalFailedEvent = (event: SendWithdrawalFailedEvent) => {
  const withdrawalFailedEventJoiValidationKeys: KeysRequired<SendWithdrawalFailedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getWithdrawalFailedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
  };

  const withdrawalFailedEventJoiSchema = Joi.object(withdrawalFailedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalFailedEventJoiSchema);
};
