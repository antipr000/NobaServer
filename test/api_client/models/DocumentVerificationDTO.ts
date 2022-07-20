/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationDTO = {
  documentVerificationStatus?: "NotRequired" | "Required" | "Pending" | "Verified" | "Rejected" | "LivePhotoVerified";
  updatedTimestamp?: number;
};
