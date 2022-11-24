/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { KybStatusInfoDTO } from "./KybStatusInfoDTO";
import type { PartnerConfigDTO } from "./PartnerConfigDTO";

export type PartnerDTO = {
  _id: string;
  name: string;
  verificationData?: KybStatusInfoDTO;
  apiKey: string;
  apiKeyForEmbed: string;
  secretKey: string;
  webhookClientID: string;
  webhookSecret: string;
  logoSmall?: string;
  logo?: string;
  config?: PartnerConfigDTO;
  isAPIEnabled?: boolean;
  isEmbedEnabled?: boolean;
};
