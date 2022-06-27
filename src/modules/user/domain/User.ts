import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { Entity } from "../../../core/domain/Entity";
import { Address } from "./Address";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "./VerificationStatus";

export interface UserProps extends VersioningInfo {
  _id: string;
  name?: string;
  email?: string;
  stripeCustomerID?: string;
  checkoutCustomerID?: string;
  phone?: string;
  isAdmin?: boolean;
  idVerificationStatus?: string;
  documentVerificationStatus?: string;
  documentVerificationTransactionId?: string;
  idVerificationTimestamp?: number;
  documentVerificationTimestamp?: number;
  dateOfBirth?: string;
  address?: Address;
}

const addressValidationJoiKeys: KeysRequired<Address> = {
  streetLine1: Joi.string().optional(),
  streetLine2: Joi.string().optional(),
  city: Joi.string().optional(),
  regionCode: Joi.string().optional(),
  countryCode: Joi.string().optional(),
  postalCode: Joi.string().optional(),
};

export const userJoiValidationKeys: KeysRequired<UserProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string()
    .email()
    .allow(null)
    .optional()
    .meta({ _mongoose: { index: true } }),
  stripeCustomerID: Joi.string().optional(),
  checkoutCustomerID: Joi.string().optional(),
  phone: Joi.string()
    .optional()
    .allow(null)
    .meta({ _mongoose: { index: true } }), //TODO phone number validation, how do we want to store phone number? country code + phone number?
  isAdmin: Joi.boolean().default(false),
  idVerificationStatus: Joi.string().default(ConsumerVerificationStatus.NEW),
  documentVerificationStatus: Joi.string().default(DocumentVerificationStatus.NOT_SUBMITTED),
  documentVerificationTransactionId: Joi.string().optional(),
  idVerificationTimestamp: Joi.number().optional(),
  documentVerificationTimestamp: Joi.number().optional(),
  dateOfBirth: Joi.string().optional(),
  address: Joi.object().keys(addressValidationJoiKeys).optional(),
};

export const userJoiSchema = Joi.object(userJoiValidationKeys).options({ allowUnknown: true, stripUnknown: false });

export class User extends AggregateRoot<UserProps> {
  private constructor(userProps: UserProps) {
    super(userProps);
  }

  public static createUser(userProps: Partial<UserProps>): User {
    //set email verified to true when user authenticates via third party and not purely via email
    if (!userProps._id) userProps._id = Entity.getNewID();

    if (!userProps.phone && !userProps.email) throw new Error("User must have either phone or email");

    const user = new User(Joi.attempt(userProps, userJoiSchema));
    return user;
  }
}
