import Joi from "joi";
import {
  DepositFailedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDepositFailedEvent extends BaseEvent {
  params: DepositFailedNotificationParameters;
}

export const validateDepositFailedEvent = (event: SendDepositFailedEvent) => {
  const depositFailedEventJoiValidationKeys: KeysRequired<SendDepositFailedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    nobaUserID: Joi.string().required(),
    phone: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositFailedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
  };

  const depositFailedEventJoiSchema = Joi.object(depositFailedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, depositFailedEventJoiSchema);
};
