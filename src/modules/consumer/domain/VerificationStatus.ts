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
  REJECTED_DOCUMENT_REQUIRES_RECAPTURE = "Rejected_RequiresRecapture",
  REJECTED_DOCUMENT_POOR_QUALITY = "Rejected_PoorQuality",
  REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE = "Rejected_SizeOrType",
  LIVE_PHOTO_VERIFIED = "LivePhotoVerified",
}

export enum WalletStatus {
  PENDING = "Pending",
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
  DELETED = "Deleted",
}

export enum PaymentMethodStatus {
  FLAGGED = "Flagged",
  REJECTED = "Rejected",
  APPROVED = "Approved",
  UNSUPPORTED = "Unsupported",
  DELETED = "Deleted",
}

export enum RiskLevel {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}
