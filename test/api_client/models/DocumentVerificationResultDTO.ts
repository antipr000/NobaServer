/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationResultDTO = {
  status:
    | "NotRequired"
    | "Required"
    | "Pending"
    | "Approved"
    | "Rejected"
    | "Rejected_RequiresRecapture"
    | "Rejected_PoorQuality"
    | "Rejected_SizeOrType"
    | "LivePhotoVerified";
};
