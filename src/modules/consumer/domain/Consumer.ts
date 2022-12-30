import { BadRequestException } from "@nestjs/common";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { Consumer as ConsumerModel, KYCProvider } from "@prisma/client";
import { Address, addressValidationJoiKeys } from "./Address";
import { isValidDateOfBirth } from "../../../core/utils/DateUtils";
import { KeysRequired } from "../../common/domain/Types";
import { differenceInDays } from "date-fns";
import { KYC, kycValidationJoiKeys } from "./KYC";
import { Utils } from "../../../core/utils/Utils";

export class ConsumerProps implements ConsumerModel {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  displayEmail: string | null;
  handle: string | null;
  referralCode: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isLocked: boolean;
  isDisabled: boolean;
  createdTimestamp: Date | null;
  updatedTimestamp: Date | null;
  socialSecurityNumber: string | null;
  address?: Address;
  verificationData?: KYC;
  referredByID: string | null;
}

export const consumerJoiValidationKeys: KeysRequired<ConsumerProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  firstName: Joi.string().min(2).max(100).optional().allow(null),
  lastName: Joi.string().min(2).max(100).optional().allow(null),
  email: Joi.string().email().allow(null).optional(),
  handle: Joi.string().optional().allow(null),
  displayEmail: Joi.string().email().optional().allow(null),
  referralCode: Joi.string().required(),
  phone: Joi.string()
    .pattern(/^\+[0-9 ]+$/) // allows digits, spaces, and + sign TODO(CRYPTO-402) Remove space after all envs have been migrated.
    .max(35) // allows for country code and extension with some spaces in between
    .optional()
    .allow(null),
  dateOfBirth: Joi.string().optional().allow(null),
  address: Joi.object().keys(addressValidationJoiKeys).optional().allow(null),
  socialSecurityNumber: Joi.string().optional().allow(null),
  isLocked: Joi.boolean().optional(),
  isDisabled: Joi.boolean().optional(),
  verificationData: Joi.object().keys(kycValidationJoiKeys).optional().allow(null),
  referredByID: Joi.string().optional().allow(null),
};

export const consumerJoiSchema = Joi.object(consumerJoiValidationKeys).options({
  allowUnknown: true,
  stripUnknown: false,
});

export class Consumer extends AggregateRoot<ConsumerProps> {
  private constructor(consumerProps: ConsumerProps) {
    super(consumerProps);
  }

  public static createConsumer(consumerProps: Partial<ConsumerProps>): Consumer {
    //set email verified to true when user authenticates via third party and not purely via email
    if (!consumerProps.id) consumerProps.id = Entity.getNewID();

    if (!consumerProps.referralCode) consumerProps.referralCode = Utils.getAlphaNanoID(15);

    if (!consumerProps.phone && !consumerProps.email) throw new Error("User must have either phone or email");

    if (consumerProps.dateOfBirth) {
      if (!isValidDateOfBirth(consumerProps.dateOfBirth)) {
        throw new BadRequestException("dateOfBirth should be valid and of the format YYYY-MM-DD");
      }
    }

    if (consumerProps.verificationData && !consumerProps.verificationData.provider)
      consumerProps.verificationData.provider = KYCProvider.SARDINE;

    return new Consumer(Joi.attempt(consumerProps, consumerJoiSchema));
  }

  public getAccountAge(): number {
    const createdTimestamp = this.props.createdTimestamp;
    return differenceInDays(new Date(), createdTimestamp);
  }
}
