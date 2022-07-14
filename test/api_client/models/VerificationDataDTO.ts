/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerificationDataDTO = {
  verificationProvider?: any;
  kycVerificationStatus?:
    | "Pending-New"
    | "Pending-KYCSubmitted"
    | "Pending-KYCApproved"
    | "Pending-Flagged-KYC"
    | "Pending-Flagged-Fraud"
    | "Pending-Flagged-Wallet"
    | "Approved"
    | "NotApproved-Rejected-KYC"
    | "NotApproved-Rejected-Fraud"
    | "NotApproved-Rejected-Wallet";
  documentVerificationStatus?:
    | "NotSubmitted"
    | "NotRequired"
    | "Pending"
    | "Verified"
    | "Rejected"
    | "LivePhotoVerified";
};
