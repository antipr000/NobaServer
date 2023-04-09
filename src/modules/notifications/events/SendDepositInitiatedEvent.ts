import Joi from "joi";
import {
  DepositInitiatedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDepositInitiatedEvent extends BaseEvent {
  params: DepositInitiatedNotificationParameters;
}

export const validateDepositInitiatedEvent = (event: SendDepositInitiatedEvent) => {
  const depositInitiatedEventJoiValidationKeys: KeysRequired<SendDepositInitiatedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositInitiatedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
  };

  const depositInitiatedEventJoiSchema = Joi.object(depositInitiatedEventJoiValidationKeys);

  Joi.attempt(event, depositInitiatedEventJoiSchema);
};
