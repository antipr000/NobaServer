import {
  CreditAdjustmentFailedNotificationParameters,
  TransactionNotificationParamsJoiSchema,
} from "../domain/TransactionNotificationParameters";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendCreditAdjustmentFailedEvent extends BaseEvent {
  params: CreditAdjustmentFailedNotificationParameters;
}

export const validateSendCreditAdjustmentFailedEvent = (event: SendCreditAdjustmentFailedEvent) => {
  const creditAdjustmentFailedEventJoiValidationKeys: KeysRequired<SendCreditAdjustmentFailedEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    handle: Joi.string().required(),
    params: Joi.object(
      TransactionNotificationParamsJoiSchema.getCreditAdjustmentFailedNotificationParamsSchema(),
    ).required(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const creditAdjustmentFailedEventJoiSchema = Joi.object(creditAdjustmentFailedEventJoiValidationKeys).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, creditAdjustmentFailedEventJoiSchema);
};
