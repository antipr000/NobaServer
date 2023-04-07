import Joi from "joi";
import {
  DepositFailedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDepositFailedEvent {
  email: string;
  name: string;
  handle: string;
  params: DepositFailedNotificationParameters;
  pushTokens?: string[];
  locale?: string;
}

export const validateDepositFailedEvent = (event: SendDepositFailedEvent) => {
  const depositFailedEventJoiValidationKeys: KeysRequired<SendDepositFailedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositFailedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const depositFailedEventJoiSchema = Joi.object(depositFailedEventJoiValidationKeys);

  Joi.attempt(event, depositFailedEventJoiSchema);
};
