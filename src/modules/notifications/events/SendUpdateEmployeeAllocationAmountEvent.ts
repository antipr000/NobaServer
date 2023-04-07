import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendUpdateEmployeeAllocationAmountEvent {
  nobaEmployeeID: string;
  allocationAmountInPesos: number;
}

export const validateSendUpdateEmployeeAllocationAmountEvent = (event: SendUpdateEmployeeAllocationAmountEvent) => {
  const sendUpdateEmployeeAllocationAmountEventJoiValidationKeys: KeysRequired<SendUpdateEmployeeAllocationAmountEvent> =
    {
      nobaEmployeeID: Joi.string().required(),
      allocationAmountInPesos: Joi.number().required(),
    };

  const sendUpdateEmployeeAllocationAmountEventJoiSchema = Joi.object(
    sendUpdateEmployeeAllocationAmountEventJoiValidationKeys,
  );

  Joi.attempt(event, sendUpdateEmployeeAllocationAmountEventJoiSchema);
};
