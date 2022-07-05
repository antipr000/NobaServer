/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type LoginRequestDTO = {
  email: string;
  identityType: "CONSUMER" | "PARTNER_ADMIN" | "NOBA_ADMIN";
  partnerID?: string;
};
