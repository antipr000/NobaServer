/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { KybStatusInfoDTO } from "./KybStatusInfoDTO";

export type PartnerDTO = {
  _id: string;
  name: string;
  verificationData?: KybStatusInfoDTO;
  apiKey: string;
  secretKey: string;
  logoSmall?: string;
  logo?: string;
};
