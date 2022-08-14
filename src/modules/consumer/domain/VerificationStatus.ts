export enum KYCStatus {
  NOT_SUBMITTED = "NotSubmitted",
  PENDING = "Pending",
  APPROVED = "Approved",
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
}

export enum DocumentVerificationStatus {
  NOT_REQUIRED = "NotRequired",
  REQUIRED = "Required",
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  LIVE_PHOTO_VERIFIED = "LivePhotoVerified",
}

export enum WalletStatus {
  PENDING = "PENDING",
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
}

export enum PaymentMethodStatus {
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
}

export enum RiskLevel {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}
