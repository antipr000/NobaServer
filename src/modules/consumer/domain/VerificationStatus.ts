export enum ConsumerVerificationStatus {
  PENDING_NEW = "Pending-New",
  PENDING_KYC_SUBMITTED = "Pending-KYCSubmitted",
  PENDING_KYC_APPROVED = "Pending-KYCApproved",
  PENDING_FLAGGED_KYC = "Pending-Flagged-KYC",
  PENDING_FLAGGED_FRAUD = "Pending-Flagged-Fraud",
  PENDING_FLAGGED_WALLET = "Pending-Flagged-Wallet",
  APPROVED = "Approved",
  NOT_APPROVED_REJECTED_KYC = "NotApproved-Rejected-KYC",
  NOT_APPROVED_REJECTED_FRAUD = "NotApproved-Rejected-Fraud",
  NOT_APPROVED_REJECTED_WALLET = "NotApproved-Rejected-Wallet",
}

export enum DocumentVerificationStatus {
  NOT_SUBMITTED = "NotSubmitted",
  NOT_REQUIRED = "NotRequired",
  PENDING = "Pending",
  VERIFIED = "Verified",
  REJECTED = "Rejected",
  LIVE_PHOTO_VERIFIED = "LivePhotoVerified",
}
