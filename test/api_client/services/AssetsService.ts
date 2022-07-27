/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfigurationsDTO } from "../models/ConfigurationsDTO";
import type { CurrencyDTO } from "../models/CurrencyDTO";
import type { LocationDTO } from "../models/LocationDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AssetsService {
  /**
   * Returns a list of all cryptocurrencies supported by Noba Onramp
   * @returns CurrencyDTO List of all supported cryptocurrencies
   * @throws ApiError
   */
  public static supportedCryptocurrencies(): CancelablePromise<Array<CurrencyDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/cryptocurrencies",
    });
  }

  /**
   * Returns a list of all fiat currencies supported by Noba Onramp
   * @returns CurrencyDTO List of all supported fiat currencies
   * @throws ApiError
   */
  public static supportedFiatCurrencies(): CancelablePromise<Array<CurrencyDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/fiatcurrencies",
    });
  }

  /**
   * Returns a list of all countries supported by Noba Onramp
   * @param includeSubdivisions Include subdivision data
   * @returns LocationDTO Location details of supported countries, optionally including subdivision data
   * @throws ApiError
   */
  public static getSupportedCountries(includeSubdivisions?: boolean): CancelablePromise<Array<LocationDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/countries",
      query: {
        includeSubdivisions: includeSubdivisions,
      },
    });
  }

  /**
   * Returns details of a country and its subdivisions supported by Noba Onramp
   * @param countryCode
   * @returns LocationDTO Location details of requested country
   * @throws ApiError
   */
  public static getSupportedCountry(countryCode: string): CancelablePromise<LocationDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/countries/{countryCode}",
      path: {
        countryCode: countryCode,
      },
      errors: {
        404: `Country code not found`,
      },
    });
  }

  /**
   * Returns common api configurations
   * @returns ConfigurationsDTO Common api configurations
   * @throws ApiError
   */
  public static getCommonConfigurations(): CancelablePromise<ConfigurationsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/config",
      errors: {
        404: `Configurations not found`,
      },
    });
  }
}
