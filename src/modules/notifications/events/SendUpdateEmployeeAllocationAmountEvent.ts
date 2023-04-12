import Joi from "joi";
import { BaseEvent } from "./BaseEvent";

export class SendUpdateEmployeeAllocationAmountEvent extends BaseEvent {
  nobaEmployeeID: string;
  allocationAmountInPesos: number;
}

export const validateSendUpdateEmployeeAllocationAmountEvent = (event: SendUpdateEmployeeAllocationAmountEvent) => {
  const sendUpdateEmployeeAllocationAmountEventJoiValidationKeys = {
    nobaEmployeeID: Joi.string().required(),
    allocationAmountInPesos: Joi.number().required(),
  };

  const sendUpdateEmployeeAllocationAmountEventJoiSchema = Joi.object(
    sendUpdateEmployeeAllocationAmountEventJoiValidationKeys,
  ).options({
    allowUnknown: true,
    stripUnknown: true,
  });

  Joi.attempt(event, sendUpdateEmployeeAllocationAmountEventJoiSchema);
};
