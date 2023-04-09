import {
  TransactionNotificationParamsJoiSchema,
  WithdrawalIntiatedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { BaseEvent } from "./BaseEvent";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendWithdrawalInitiatedEvent extends BaseEvent {
  params: WithdrawalIntiatedNotificationParameters;
}

export const validateWithdrawalInitiatedEvent = (event: SendWithdrawalInitiatedEvent) => {
  const withdrawalInitiatedEventJoiValidationKeys: KeysRequired<SendWithdrawalInitiatedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getWithdrawalIntiatedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const withdrawalInitiatedEventJoiSchema = Joi.object(withdrawalInitiatedEventJoiValidationKeys);

  Joi.attempt(event, withdrawalInitiatedEventJoiSchema);
};
