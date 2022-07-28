import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { Entity } from "../../../core/domain/Entity";
import { Address } from "./Address";
import { KYCStatus, DocumentVerificationStatus } from "./VerificationStatus";
import { PartnerDetails } from "./PartnerDetails";
import { PaymentProviderDetails } from "./PaymentProviderDetails";
import { VerificationData, VerificationProviders } from "./VerificationData";
import { PaymentMethod } from "./PaymentMethod";
import { CryptoWallet } from "./CryptoWallet";
import { BadRequestException } from "@nestjs/common";
import { isValidDateOfBirth } from "../../../core/utils/DateUtils";

export interface ConsumerProps extends VersioningInfo {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isAdmin?: boolean;
  dateOfBirth?: string;
  address?: Address;
  socialSecurityNumber?: string;
  nationalID?: string;
  nationalIDType?: string;
  riskRating?: string;
  isSuspectedFraud?: boolean;
  isLocked?: boolean;
  isDisabled?: boolean;
  zhParticipantCode?: string;
  partners?: PartnerDetails[];
  paymentProviderAccounts?: PaymentProviderDetails[];
  verificationData?: VerificationData;
  paymentMethods?: PaymentMethod[];
  cryptoWallets?: CryptoWallet[];
}

const partnerValidationJoiKeys: KeysRequired<PartnerDetails> = {
  partnerID: Joi.string().required(),
};

const paymentProviderValidationJoiKeys: KeysRequired<PaymentProviderDetails> = {
  providerID: Joi.string().required(),
  providerCustomerID: Joi.string().required(),
};

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
  cardName: Joi.string().optional(),
  cardType: Joi.string().optional(),
  first6Digits: Joi.string().optional(),
  last4Digits: Joi.string().optional(),
  imageUri: Joi.string().optional(),
  paymentToken: Joi.string().required(),
  paymentProviderID: Joi.string().required(),
  status: Joi.string().optional(),
};

const cryptoWalletsValidationJoiKeys: KeysRequired<CryptoWallet> = {
  walletName: Joi.string().optional(),
  address: Joi.string().required(),
  chainType: Joi.string().optional(),
  isEVMCompatible: Joi.boolean().required(),
  status: Joi.string().optional(),
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
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  email: Joi.string()
    .email()
    .allow(null)
    .optional()
    .meta({ _mongoose: { index: true } }),
  phone: Joi.string()
    .optional()
    .allow(null)
    .meta({ _mongoose: { index: true } }), //TODO phone number validation, how do we want to store phone number? country code + phone number?
  isAdmin: Joi.boolean().default(false),
  dateOfBirth: Joi.string().optional(),
  address: Joi.object().keys(addressValidationJoiKeys).optional(),
  socialSecurityNumber: Joi.string().optional(),
  nationalID: Joi.string().optional(),
  nationalIDType: Joi.string().optional(),
  riskRating: Joi.string().optional(),
  isSuspectedFraud: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  isDisabled: Joi.boolean().optional(),
  zhParticipantCode: Joi.string().optional(),
  partners: Joi.array().items(partnerValidationJoiKeys).required(),
  paymentProviderAccounts: Joi.array().items(paymentProviderValidationJoiKeys).optional(),
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
    if (!consumerProps._id) consumerProps._id = Entity.getNewID();

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
      paymentMethod => paymentMethod.paymentToken === paymentMethodID,
    );

    if (paymentMethodList.length === 0) {
      return null;
    }

    return paymentMethodList[0];
  }
}
