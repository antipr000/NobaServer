import { KYC as KYCModel, KYCStatus, DocumentVerificationStatus, KYCProvider } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class KYC implements KYCModel {
  id: string;
  provider: KYCProvider;
  kycCheckReference: string | null;
  documentCheckReference: string | null;
  riskRating: string | null;
  isSuspectedFraud: boolean;
  kycCheckStatus: KYCStatus;
  documentVerificationStatus: DocumentVerificationStatus;
  documentVerificationTimestamp: Date;
  kycVerificationTimestamp: Date;
  sanctionLevel: string | null;
  riskLevel: string | null;
  consumerID: string;
}

export const kycValidationJoiKeys: KeysRequired<KYC> = {
  id: Joi.string().required(),
  provider: Joi.string().required().default(KYCProvider.SARDINE),
  kycCheckStatus: Joi.string().default(KYCStatus.NOT_SUBMITTED),
  kycVerificationTimestamp: Joi.date().optional().allow(null),
  documentVerificationStatus: Joi.string().default(DocumentVerificationStatus.NOT_REQUIRED),
  documentVerificationTimestamp: Joi.number().optional().allow(null),
  documentCheckReference: Joi.string().optional().allow(null),
  kycCheckReference: Joi.string().optional().allow(null),
  sanctionLevel: Joi.string().optional().allow(null),
  riskRating: Joi.string().optional().allow(null),
  isSuspectedFraud: Joi.boolean().optional().default(false),
  riskLevel: Joi.string().optional().allow(null),
  consumerID: Joi.string().required(),
};
