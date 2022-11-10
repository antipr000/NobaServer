/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationDTO = {
  documentVerificationStatus?: "NotRequired" | "NotSubmitted" | "Pending" | "Verified" | "ActionRequired" | "Rejected";
  documentVerificationErrorReason?: "RequiresRecapture" | "PoorQuality" | "SizeOrType";
  updatedTimestamp?: number;
};
