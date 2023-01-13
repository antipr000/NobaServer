import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { ContactPhoneDTO } from "../dto/ContactPhoneDTO";
import CountryList from "country-list-with-dial-code-and-flag";

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

export const contactPhoneDTOToString = (contactPhoneDTO: ContactPhoneDTO) => {
  if (contactPhoneDTO.digits[0] === "+") {
    return contactPhoneDTO.digits;
  }

  const { dial_code } = CountryList.findFlagByDialCode(contactPhoneDTO.countryCode);
  return dial_code + contactPhoneDTO.digits;
};
