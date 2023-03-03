/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ConsumerInternalKYCDTO = {
  provider?: "SARDINE";
  kycCheckReference?: string;
  documentCheckReference?: string;
  riskRating?: string;
  isSuspectedFraud?: boolean;
  kycCheckStatus?: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "FLAGGED" | "REJECTED";
  documentVerificationStatus?:
    | "NOT_REQUIRED"
    | "REQUIRED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "REJECTED_DOCUMENT_REQUIRES_RECAPTURE"
    | "REJECTED_DOCUMENT_POOR_QUALITY"
    | "REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE"
    | "LIVE_PHOTO_VERIFIED";
  documentVerificationTimestamp?: string;
  kycVerificationTimestamp?: string;
  sanctionLevel?: string;
  riskLevel?: string;
};
