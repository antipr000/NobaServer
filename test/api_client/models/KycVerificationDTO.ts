/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type KycVerificationDTO = {
  kycVerificationStatus: "NotSubmitted" | "Pending" | "Approved" | "Rejected";
  updatedTimestamp?: number;
};
