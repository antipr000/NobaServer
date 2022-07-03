/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type UserDTO = {
  _id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  name?: string;
  email: string;
  phone?: string;
  isEmailVerified?: boolean;
  idVerificationStatus?:
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
  socialSecurityNumber?: string;
};
