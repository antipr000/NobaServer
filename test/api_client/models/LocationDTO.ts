/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SubdivisionDTO } from "./SubdivisionDTO";

export type LocationDTO = {
  countryName: string;
  alternateCountryName?: string;
  countryISOCode: string;
  subdivisions?: Array<SubdivisionDTO>;
  countryFlagIconPath?: string;
};
