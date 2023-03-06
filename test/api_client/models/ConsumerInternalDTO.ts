/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConsumerEmployeeDetailsDTO } from "./ConsumerEmployeeDetailsDTO";
import type { ConsumerInternalAddressDTO } from "./ConsumerInternalAddressDTO";
import type { ConsumerInternalKYCDTO } from "./ConsumerInternalKYCDTO";
import type { ConsumerWalletDetailsDTO } from "./ConsumerWalletDetailsDTO";

export type ConsumerInternalDTO = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  displayEmail?: string;
  handle?: string;
  referralCode?: string;
  phone?: string;
  locale?: string;
  dateOfBirth?: string;
  isLocked?: boolean;
  isDisabled?: boolean;
  createdTimestamp?: string;
  updatedTimestamp?: string;
  socialSecurityNumber?: string;
  address?: ConsumerInternalAddressDTO;
  verificationData?: ConsumerInternalKYCDTO;
  referredByID?: string;
  walletDetails?: Array<ConsumerWalletDetailsDTO>;
  employeeDetails?: Array<ConsumerEmployeeDetailsDTO>;
};
