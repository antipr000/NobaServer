/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddressDTO } from "./AddressDTO";
import type { NationalIDDTO } from "./NationalIDDTO";

export type IDVerificationRequestDTO = {
  firstName: string;
  lastName: string;
  address: AddressDTO;
  phoneNumber: string;
  /**
   * Date of birth in format YYYY-MM-DD
   */
  dateOfBirth: string;
  nationalID?: NationalIDDTO;
};
