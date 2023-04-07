import {
  TransactionNotificationParamsJoiSchema,
  TransferFailedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendTransferFailedEvent {
  email: string;
  name: string;
  handle: string;
  pushTokens: string[];
  params: TransferFailedNotificationParameters;
  locale?: string;
}

export const validateTransferFailedEvent = (event: SendTransferFailedEvent) => {
  const transferFailedEventJoiValidationKeys: KeysRequired<SendTransferFailedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getTransferFailedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
  };

  const transferFailedEventJoiSchema = Joi.object(transferFailedEventJoiValidationKeys);

  Joi.attempt(event, transferFailedEventJoiSchema);
};
