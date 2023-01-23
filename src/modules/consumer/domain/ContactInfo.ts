import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class ContactInfo {
  phoneNumbers: string[];
  emails: string[];
}

export const kycValidationJoiKeys: KeysRequired<ContactInfo> = {
  phoneNumbers: Joi.array().items(Joi.string()).optional().allow(null),
  emails: Joi.array().items(Joi.string()).optional().allow(null),
};
