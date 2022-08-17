/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationDTO = {
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
  updatedTimestamp?: number;
};
