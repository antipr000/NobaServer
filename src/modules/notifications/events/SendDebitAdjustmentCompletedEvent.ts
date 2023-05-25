import {
  DebitAdjustmentCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDebitAdjustmentCompletedEvent extends BaseEvent {
  params: DebitAdjustmentCompletedNotificationParameters;
}

export const validateSendDebitAdjustmentCompletedEvent = (event: SendDebitAdjustmentCompletedEvent) => {
  const debitAdjustmentCompletedEventJoiValidationKeys: KeysRequired<SendDebitAdjustmentCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getDebitAdjustmentCompletedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const debitAdjustmentCompletedEventJoiSchema = Joi.object(debitAdjustmentCompletedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, debitAdjustmentCompletedEventJoiSchema);
};
