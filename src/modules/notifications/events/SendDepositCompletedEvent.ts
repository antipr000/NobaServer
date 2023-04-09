import Joi from "joi";
import {
  DepositCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDepositCompletedEvent extends BaseEvent {
  params: DepositCompletedNotificationParameters;
  pushTokens?: string[];
}

export const validateDepositCompletedEvent = (event: SendDepositCompletedEvent) => {
  const depositCompletedEventJoiValidationKeys: KeysRequired<SendDepositCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    phone: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositCompletedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required(),
    locale: Joi.string().optional(),
  };

  const depositCompletedEventJoiSchema = Joi.object(depositCompletedEventJoiValidationKeys);

  Joi.attempt(event, depositCompletedEventJoiSchema);
};
