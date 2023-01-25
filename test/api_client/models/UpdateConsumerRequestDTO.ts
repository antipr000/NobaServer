/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UpdateAddressDTO } from "./UpdateAddressDTO";

export type UpdateConsumerRequestDTO = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  locale?: string;
  handle?: string;
  address?: UpdateAddressDTO;
  referredByCode?: string;
};
