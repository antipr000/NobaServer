/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ConsumerDTO = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
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
  dateOfBirth?: string;
  address?: any;
  paymentMethods?: Array<string>;
  cryptoWallets?: Array<string>;
};