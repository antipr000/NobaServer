import {
  DebitAdjustmentFailedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendDebitAdjustmentFailedEvent extends BaseEvent {
  params: DebitAdjustmentFailedNotificationParameters;
}

export const validateSendDebitAdjustmentFailedEvent = (event: SendDebitAdjustmentFailedEvent) => {
  const debitAdjustmentFailedEventJoiValidationKeys: KeysRequired<SendDebitAdjustmentFailedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getDebitAdjustmentFailedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const debitAdjustmentFailedEventJoiSchema = Joi.object(debitAdjustmentFailedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, debitAdjustmentFailedEventJoiSchema);
};
