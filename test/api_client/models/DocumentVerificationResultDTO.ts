/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentVerificationResultDTO = {
  status: "NotRequired" | "NotSubmitted" | "Pending" | "Verified" | "ActionRequired" | "Rejected";
  errorReason?: "RequiresRecapture" | "PoorQuality" | "SizeOrType";
};
