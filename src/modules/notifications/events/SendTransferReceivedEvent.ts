import {
  TransactionNotificationParamsJoiSchema,
  TransferReceivedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendTransferReceivedEvent extends BaseEvent {
  params: TransferReceivedNotificationParameters;
}

export const validateTransferReceivedEvent = (event: SendTransferReceivedEvent) => {
  const transferReceivedEventJoiValidationKeys: KeysRequired<SendTransferReceivedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getTransferReceivedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const transferReceivedEventJoiSchema = Joi.object(transferReceivedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, transferReceivedEventJoiSchema);
};
