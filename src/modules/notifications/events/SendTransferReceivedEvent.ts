import {
  TransactionNotificationParamsJoiSchema,
  TransferReceivedNotificationParameters,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendTransferReceivedEvent {
  email: string;
  name: string;
  handle: string;
  params: TransferReceivedNotificationParameters;
  pushTokens: string[];
  locale?: string;
}

export const validateTransferReceivedEvent = (event: SendTransferReceivedEvent) => {
  const transferReceivedEventJoiValidationKeys: KeysRequired<SendTransferReceivedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getTransferReceivedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const transferReceivedEventJoiSchema = Joi.object(transferReceivedEventJoiValidationKeys);

  Joi.attempt(event, transferReceivedEventJoiSchema);
};
