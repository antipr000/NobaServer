import { DocumentVerificationStatus, KYCStatus } from "./VerificationStatus";

export enum UserState {
  APPROVED = "Approved",
  PENDING = "Pending",
  ACTION_REQUIRED = "ActionRequired",
  TEMPORARY_HOLD = "TemporaryHold",
  PERMANENT_HOLD = "PermanentHold",
}

export enum KycVerificationState {
  NOT_SUBMITTED = "NotSubmitted",
  PENDING = "Pending",
  APPROVED = "Approved",
  ACTION_REQUIRED = "ActionRequired",
}

export const kycVerificationStatusToStateMap = {
  [KYCStatus.APPROVED]: KycVerificationState.APPROVED,
  [KYCStatus.FLAGGED]: KycVerificationState.PENDING,
  [KYCStatus.PENDING]: KycVerificationState.PENDING,
  [KYCStatus.NOT_SUBMITTED]: KycVerificationState.NOT_SUBMITTED,
  [KYCStatus.REJECTED]: KycVerificationState.ACTION_REQUIRED,
};

export enum DocumentVerificationState {
  NOT_REQUIRED = "NotRequired",
  NOT_SUBMITTED = "NotSubmitted",
  PENDING = "Pending",
  VERIFIED = "Verified",
  ACTION_REQUIRED = "ActionRequired",
}

export enum DocumentVerificationErrorReason {
  REQUIRES_RECAPTURE = "RequiresRecapture",
  POOR_QUALITY = "PoorQuality",
  SIZE_OR_TYPE = "SizeOrType",
}

export const documentVerificationStatusToStateMap = {
  [DocumentVerificationStatus.APPROVED]: DocumentVerificationState.VERIFIED,
  [DocumentVerificationStatus.LIVE_PHOTO_VERIFIED]: DocumentVerificationState.VERIFIED,
  [DocumentVerificationStatus.NOT_REQUIRED]: DocumentVerificationState.NOT_REQUIRED,
  [DocumentVerificationStatus.REQUIRED]: DocumentVerificationState.NOT_SUBMITTED,
  [DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE]: DocumentVerificationState.NOT_SUBMITTED,
  [DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY]: DocumentVerificationState.NOT_SUBMITTED,
  [DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE]: DocumentVerificationState.NOT_SUBMITTED,
  [DocumentVerificationStatus.PENDING]: DocumentVerificationState.PENDING,
  [DocumentVerificationStatus.REJECTED]: DocumentVerificationState.NOT_REQUIRED,
};

export enum AggregatedWalletState {
  APPROVED = "Approved",
  PENDING = "Pending",
  NOT_SUBMITTED = "NotSubmitted",
}

export enum AggregatedPaymentMethodState {
  APPROVED = "Approved",
  PENDING = "Pending",
  NOT_SUBMITTED = "NotSubmitted",
}
