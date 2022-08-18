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
    | "Rejected_RequiresRecapture"
    | "Rejected_PoorQuality"
    | "Rejected_SizeOrType"
    | "LivePhotoVerified";
  updatedTimestamp?: number;
};
