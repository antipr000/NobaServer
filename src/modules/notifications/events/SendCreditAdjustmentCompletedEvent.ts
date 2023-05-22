import {
  CreditAdjustmentCompletedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendCreditAdjustmentCompletedEvent extends BaseEvent {
  params: CreditAdjustmentCompletedNotificationParameters;
}

export const validateCreditAdjustmentCompletedEvent = (event: SendCreditAdjustmentCompletedEvent) => {
  const creditAdjustmentCompletedEventJoiValidationKeys: KeysRequired<SendCreditAdjustmentCompletedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getCreditAdjustmentCompletedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const creditAdjustmentCompletedEventJoiSchema = Joi.object(creditAdjustmentCompletedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, creditAdjustmentCompletedEventJoiSchema);
};
