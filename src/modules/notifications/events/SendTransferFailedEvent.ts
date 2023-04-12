import {
  TransactionNotificationParamsJoiSchema,
  TransferFailedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendTransferFailedEvent extends BaseEvent {
  params: TransferFailedNotificationParameters;
}

export const validateTransferFailedEvent = (event: SendTransferFailedEvent) => {
  const transferFailedEventJoiValidationKeys: KeysRequired<SendTransferFailedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getTransferFailedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const transferFailedEventJoiSchema = Joi.object(transferFailedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, transferFailedEventJoiSchema);
};
