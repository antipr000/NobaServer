import {
  TransactionNotificationParamsJoiSchema,
  TransferCompletedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendTransferCompletedEvent extends BaseEvent {
  params: TransferCompletedNotificationParameters;
}

export const validateTransferCompletedEvent = (event: SendTransferCompletedEvent) => {
  const transferCompletedEventJoiValidationKeys: KeysRequired<SendTransferCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getTransferCompletedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const transferCompletedEventJoiSchema = Joi.object(transferCompletedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, transferCompletedEventJoiSchema);
};
