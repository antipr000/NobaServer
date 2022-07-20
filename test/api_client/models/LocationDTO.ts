/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Map } from "./Map";

export type LocationDTO = {
  countryName: string;
  alternateCountryName?: string;
  countryISOCode: string;
  subdivisions?: Map;
  countryFlagIconPath?: string;
};
