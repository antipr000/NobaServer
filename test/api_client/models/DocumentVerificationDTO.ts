/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationDTO = {
  documentVerificationStatus?: "NotRequired" | "Required" | "Pending" | "Approved" | "Rejected" | "LivePhotoVerified";
  updatedTimestamp?: number;
};
