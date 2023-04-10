import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalCompletedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { BaseEvent } from "./BaseEvent";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendWithdrawalCompletedEvent extends BaseEvent {
  params: WithdrawalCompletedNotificationParameters;
}

export const validateWithdrawalCompletedEvent = (event: SendWithdrawalCompletedEvent) => {
  const withdrawalCompletedEventJoiValidationKeys: KeysRequired<SendWithdrawalCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getWithdrawalCompletedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
  };

  const withdrawalCompletedEventJoiSchema = Joi.object(withdrawalCompletedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalCompletedEventJoiSchema);
};
