import Joi from "joi";
import {
  DepositInitiatedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendDepositInitiatedEvent {
  email: string;
  name: string;
  handle: string;
  params: DepositInitiatedNotificationParameters;
  locale?: string;
}

export const validateDepositInitiatedEvent = (event: SendDepositInitiatedEvent) => {
  const depositInitiatedEventJoiValidationKeys: KeysRequired<SendDepositInitiatedEvent> = {
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    handle: Joi.string().required(),
    params: Joi.object(TransactionNotificationParamsJoiSchema.getDepositInitiatedNotificationParamsSchema()).required(),
    locale: Joi.string().optional(),
  };

  const depositInitiatedEventJoiSchema = Joi.object(depositInitiatedEventJoiValidationKeys);

  Joi.attempt(event, depositInitiatedEventJoiSchema);
};
