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
  REJECTED = "Rejected",
}

export enum DocumentVerificationState {
  NOT_REQUIRED = "NotRequired",
  NOT_SUBMITTED = "NotSubmitted",
  PENDING = "Pending",
  VERIFIED = "Verified",
  ACTION_REQUIRED = "ActionRequired",
  REJECTED = "Rejected",
}

export enum DocumentVerificationErrorReason {
  REQUIRES_RECAPTURE = "RequiresRecapture",
  POOR_QUALITY = "PoorQuality",
  SIZE_OR_TYPE = "SizeOrType",
}

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

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
}
