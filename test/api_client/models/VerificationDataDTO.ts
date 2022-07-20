/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerificationDataDTO = {
  verificationProvider?: string;
  kycVerificationStatus?: "NotSubmitted" | "Pending" | "Approved" | "Flagged" | "Rejected";
  documentVerificationStatus?: "NotRequired" | "Required" | "Pending" | "Verified" | "Rejected" | "LivePhotoVerified";
};
