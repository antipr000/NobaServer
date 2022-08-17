/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerificationDataDTO = {
  verificationProvider?: "sardine";
  kycVerificationStatus?: "NotSubmitted" | "Pending" | "Approved" | "Flagged" | "Rejected";
  documentVerificationStatus?:
    | "NotRequired"
    | "Required"
    | "Pending"
    | "Approved"
    | "Rejected"
    | "Rejected_NotSupported"
    | "Rejected_PoorQuality"
    | "Rejected_SizeOrType"
    | "LivePhotoVerified";
};
