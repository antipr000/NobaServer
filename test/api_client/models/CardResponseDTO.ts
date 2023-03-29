/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CardResponseDTO = {
  id: string;
  lastFourDigits: string;
  status: "BLOCKED" | "DISABLED" | "ACTIVE";
  type: "VIRTUAL";
  consumerID: string;
};
