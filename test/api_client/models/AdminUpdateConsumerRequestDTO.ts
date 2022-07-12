/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddressDTO } from "./AddressDTO";
import type { VerificationDataDTO } from "./VerificationDataDTO";

export type AdminUpdateConsumerRequestDTO = {
  dateOfBirth?: string;
  address?: AddressDTO;
  verificationData?: VerificationDataDTO;
};
