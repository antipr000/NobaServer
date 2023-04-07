import {
  TransactionNotificationParamsJoiSchema,
  TransferCompletedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendTransferCompletedEvent {
  email: string;
  name: string;
  handle: string;
  params: TransferCompletedNotificationParameters;
  pushTokens: string[];
  locale?: string;
}

export const validateTransferCompletedEvent = (event: SendTransferCompletedEvent) => {
  const transferCompletedEventJoiValidationKeys: KeysRequired<SendTransferCompletedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getTransferCompletedNotificationParamsSchema(),
    ).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const transferCompletedEventJoiSchema = Joi.object(transferCompletedEventJoiValidationKeys);

  Joi.attempt(event, transferCompletedEventJoiSchema);
};
