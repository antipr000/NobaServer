export enum KYCStatus {
  NOT_SUBMITTED = "NotSubmitted",
  PENDING = "Pending",
  APPROVED = "Approved",
  FLAGGED = "Flagged",
  OLD_APPROVED = "Approved",
  REJECTED = "Rejected",
}

export enum DocumentVerificationStatus {
  NOT_REQUIRED = "NotRequired",
  REQUIRED = "Required",
  PENDING = "Pending",
  VERIFIED = "Verified",
  REJECTED = "Rejected",
  LIVE_PHOTO_VERIFIED = "LivePhotoVerified",
}

export enum WalletStatus {
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
}

export enum PaymentMethodStatus {
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
}
