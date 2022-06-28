export enum ConsumerVerificationStatus {
  NEW = "New",
  PENDING = "Pending",
  KYC_APPROVED = "KycApproved",
  APPROVED = "Approved",
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
}

export enum DocumentVerificationStatus {
  NOT_SUBMITTED = "NotSubmitted",
  NOT_REQUIRED = "NotRequired",
  PENDING = "Pending",
  VERIFIED = "Verified",
  REJECTED = "Rejected",
  LIVE_PHOTO_VERIFIED = "LivePhotoVerified",
}
