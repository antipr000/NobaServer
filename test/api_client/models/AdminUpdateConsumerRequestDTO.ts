/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddressDTO } from "./AddressDTO";
import type { VerificationDataDTO } from "./VerificationDataDTO";

export type AdminUpdateConsumerRequestDTO = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: "Male" | "Female";
  dateOfBirth?: string;
  address?: AddressDTO;
  handle?: string;
  isLocked?: boolean;
  isDisabled?: boolean;
  referredByID?: string;
  verificationData?: VerificationDataDTO;
};
