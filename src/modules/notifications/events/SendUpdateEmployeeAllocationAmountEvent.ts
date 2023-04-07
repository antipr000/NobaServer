import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendUpdateEmployeeAllocationAmontEvent {
  nobaEmployeeID: string;
  allocationAmountInPesos: number;
}

export const validateSendUpdateEmployeeAllocationAmountEvent = (event: SendUpdateEmployeeAllocationAmontEvent) => {
  const sendUpdateEmployeeAllocationAmountEventJoiValidationKeys: KeysRequired<SendUpdateEmployeeAllocationAmontEvent> =
    {
      nobaEmployeeID: Joi.string().required(),
      allocationAmountInPesos: Joi.number().required(),
    };

  const sendUpdateEmployeeAllocationAmountEventJoiSchema = Joi.object(
    sendUpdateEmployeeAllocationAmountEventJoiValidationKeys,
  );

  Joi.attempt(event, sendUpdateEmployeeAllocationAmountEventJoiSchema);
};
