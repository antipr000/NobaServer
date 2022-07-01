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
  idVerificationStatus?: "New" | "Pending" | "KycApproved" | "Approved" | "Flagged" | "Rejected";
  documentVerificationStatus?:
    | "NotSubmitted"
    | "NotRequired"
    | "Pending"
    | "Verified"
    | "Rejected"
    | "LivePhotoVerified";
  dateOfBirth?: string;
  address?: any;
};
