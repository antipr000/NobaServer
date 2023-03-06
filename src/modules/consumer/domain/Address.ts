import { Address as AddressModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";
import Joi from "joi";

export class Address implements Partial<AddressModel> {
  id?: string; // Marking as optional as it is not required internally
  streetLine1?: string | null;
  streetLine2?: string | null;
  city?: string | null;
  countryCode: string;
  regionCode?: string | null;
  postalCode?: string | null;
  consumerID?: string; // marking as optional as it is not required internally
}

export const addressValidationJoiKeys: KeysRequired<Address> = {
  id: Joi.string().optional(),
  streetLine1: Joi.string().optional().allow(null, ""),
  streetLine2: Joi.string().optional().allow(null, ""),
  city: Joi.string().optional().allow(null, ""),
  regionCode: Joi.string().optional().allow(null, ""),
  countryCode: Joi.string().optional(),
  postalCode: Joi.string().optional().allow(null, ""),
  consumerID: Joi.string().optional().allow(null, ""),
};
