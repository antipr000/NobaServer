import Joi from "joi";
import {
  DepositCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDepositCompletedEvent {
  email: string;
  name: string;
  handle: string;
  params: DepositCompletedNotificationParameters;
  pushTokens: string[];
  locale?: string;
}

export const validateDepositCompletedEvent = (event: SendDepositCompletedEvent) => {
  const depositCompletedEventJoiValidationKeys: KeysRequired<SendDepositCompletedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositCompletedNotificationParamsSchema()).required(),
    pushTokens: Joi.array().items(Joi.string()).required().allow([]),
    locale: Joi.string().optional(),
  };

  const depositCompletedEventJoiSchema = Joi.object(depositCompletedEventJoiValidationKeys);

  Joi.attempt(event, depositCompletedEventJoiSchema);
};
