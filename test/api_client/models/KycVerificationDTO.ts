/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type KycVerificationDTO = {
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
  updatedAt?: number;
};
