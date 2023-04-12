/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UpdateAddressDTO } from "./UpdateAddressDTO";

export type UpdateConsumerRequestDTO = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  locale?: string;
  gender?: "Male" | "Female";
  handle?: string;
  address?: UpdateAddressDTO;
  isDisabled?: boolean;
  referredByCode?: string;
};
