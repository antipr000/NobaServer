import { Address as AddressModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";
import Joi from "joi";

export class Address implements AddressModel {
  id: string;
  streetLine1: string;
  streetLine2: string | null;
  city: string;
  countryCode: string;
  regionCode: string;
  postalCode: string;
  consumerID: string;
}

export const addressValidationJoiKeys: KeysRequired<Address> = {
  id: Joi.string().required(),
  streetLine1: Joi.string().optional(),
  streetLine2: Joi.string().optional(),
  city: Joi.string().optional(),
  regionCode: Joi.string().optional(),
  countryCode: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  consumerID: Joi.string().required(),
};
