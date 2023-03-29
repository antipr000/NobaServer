/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SubdivisionDTO } from "./SubdivisionDTO";

export type LocationDTO = {
  countryName: string;
  alternateCountryName?: string;
  countryISOCode: string;
  alpha3ISOCode: string;
  dialingPrefix: string;
  subdivisions?: Array<SubdivisionDTO>;
  countryFlagIconPath?: string;
};
