/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationDTO = {
  documentVerificationStatus?:
    | "NotSubmitted"
    | "NotRequired"
    | "Pending"
    | "Verified"
    | "Rejected"
    | "LivePhotoVerified";
  updatedTimestamp?: number;
};
