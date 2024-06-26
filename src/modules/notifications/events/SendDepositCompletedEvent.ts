import Joi from "joi";
import {
  DepositCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDepositCompletedEvent extends BaseEvent {
  params: DepositCompletedNotificationParameters;
}

export const validateDepositCompletedEvent = (event: SendDepositCompletedEvent) => {
  const depositCompletedEventJoiValidationKeys: KeysRequired<SendDepositCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    phone: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositCompletedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
  };

  const depositCompletedEventJoiSchema = Joi.object(depositCompletedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, depositCompletedEventJoiSchema);
};
