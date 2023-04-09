import {
  TransactionNotificationParamsJoiSchema,
  TransferReceivedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendTransferReceivedEvent extends BaseEvent {
  params: TransferReceivedNotificationParameters;
  pushTokens?: string[];
}

export const validateTransferReceivedEvent = (event: SendTransferReceivedEvent) => {
  const transferReceivedEventJoiValidationKeys: KeysRequired<SendTransferReceivedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getTransferReceivedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const transferReceivedEventJoiSchema = Joi.object(transferReceivedEventJoiValidationKeys);

  Joi.attempt(event, transferReceivedEventJoiSchema);
};
