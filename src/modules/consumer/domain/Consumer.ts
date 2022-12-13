import { BadRequestException } from "@nestjs/common";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { Consumer as ConsumerProps } from "../../../generated/domain/consumer";
import { PaymentMethod } from "../../../generated/domain/payment_method";
import { CryptoWallet } from "../../../generated/domain/crypto_wallet";
import { isValidDateOfBirth } from "../../../core/utils/DateUtils";
import { KeysRequired } from "../../common/domain/Types";
import { Address } from "./Address";
import { VerificationData, VerificationProviders } from "./VerificationData";
import { differenceInDays } from "date-fns";
import { PaymentMethodStatus, DocumentVerificationStatus, KYCStatus } from "@prisma/client";

const verificationDataValidationJoiKeys: KeysRequired<VerificationData> = {
  verificationProvider: Joi.string().required().default(VerificationProviders.SARDINE),
  kycVerificationStatus: Joi.string().default(KYCStatus.NOT_SUBMITTED),
  kycVerificationTimestamp: Joi.number().optional(),
  documentVerificationStatus: Joi.string().default(DocumentVerificationStatus.NOT_REQUIRED),
  documentVerificationTimestamp: Joi.number().optional(),
  documentVerificationTransactionID: Joi.string().optional(),
  sanctionLevel: Joi.string().optional(),
  pepLevel: Joi.string().optional(),
};

const paymentMethodsValidationJoiKeys: KeysRequired<PaymentMethod> = {
  id: Joi.number().required(),
  name: Joi.string().optional().allow(""),
  type: Joi.string().required(),
  cardData: Joi.object().keys().optional(),
  achData: Joi.object().optional(),
  imageUri: Joi.string().optional(),
  paymentToken: Joi.string().required(),
  paymentProvider: Joi.string().required(),
  status: Joi.string().optional(),
  isDefault: Joi.boolean().default(false),
  consumerID: Joi.string().required(),
  consumer: Joi.object().required(),
};

const cryptoWalletsValidationJoiKeys: KeysRequired<CryptoWallet> = {
  id: Joi.number().required(),
  name: Joi.string().optional(),
  address: Joi.string().required(),
  chainType: Joi.string().optional(),
  isEVMCompatible: Joi.boolean().optional(),
  status: Joi.string().optional(),
  riskScore: Joi.number().optional(),
  consumerID: Joi.string().required(),
  consumer: Joi.object().required(),
};

const addressValidationJoiKeys: KeysRequired<Address> = {
  streetLine1: Joi.string().optional(),
  streetLine2: Joi.string().optional(),
  city: Joi.string().optional(),
  regionCode: Joi.string().optional(),
  countryCode: Joi.string().optional(),
  postalCode: Joi.string().optional(),
};

export const consumerJoiValidationKeys: KeysRequired<ConsumerProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  firstName: Joi.string().min(2).max(100).optional().allow(null),
  lastName: Joi.string().min(2).max(100).optional().allow(null),
  email: Joi.string().email().allow(null).optional(),
  handle: Joi.string().optional().allow(null),
  displayEmail: Joi.string().email().optional().allow(null),
  phone: Joi.string()
    .pattern(/^\+[0-9 ]+$/) // allows digits, spaces, and + sign TODO(CRYPTO-402) Remove space after all envs have been migrated.
    .max(35) // allows for country code and extension with some spaces in between
    .optional()
    .allow(null),
  dateOfBirth: Joi.string().optional().allow(null),
  address: Joi.object().keys(addressValidationJoiKeys).optional(),
  socialSecurityNumber: Joi.string().optional().allow(null),
  isLocked: Joi.boolean().optional(),
  isDisabled: Joi.boolean().optional(),
  verificationData: Joi.object().keys(verificationDataValidationJoiKeys).optional(),
  paymentMethods: Joi.array().items(paymentMethodsValidationJoiKeys).default([]),
  cryptoWallets: Joi.array().items(cryptoWalletsValidationJoiKeys).default([]),
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

    if (!consumerProps.phone && !consumerProps.email) throw new Error("User must have either phone or email");

    if (consumerProps.dateOfBirth) {
      if (!isValidDateOfBirth(consumerProps.dateOfBirth)) {
        throw new BadRequestException("dateOfBirth should be valid and of the format YYYY-MM-DD");
      }
    }

    return new Consumer(Joi.attempt(consumerProps, consumerJoiSchema));
  }

  public getPaymentMethodByID(paymentMethodID: string): PaymentMethod {
    const paymentMethodList: PaymentMethod[] = this.props.paymentMethods.filter(
      paymentMethod =>
        paymentMethod.paymentToken === paymentMethodID && paymentMethod.status !== PaymentMethodStatus.DELETED,
    );

    if (paymentMethodList.length === 0) {
      return null;
    }

    return paymentMethodList[0];
  }

  public getAccountAge(): number {
    const createdTimestamp = this.props.createdTimestamp;
    return differenceInDays(new Date(), createdTimestamp);
  }
}
