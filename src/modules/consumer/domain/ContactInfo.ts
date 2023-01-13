import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class ContactInfo {
  id: string;
  phoneNumbers: string[];
  emails: string[];
}

export const kycValidationJoiKeys: KeysRequired<ContactInfo> = {
  id: Joi.string().optional(),
  phoneNumbers: Joi.array().items(Joi.string()).optional().allow(null),
  emails: Joi.array().items(Joi.string()).optional().allow(null),
};
