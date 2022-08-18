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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns CurrencyDTO List of all supported cryptocurrencies
   * @throws ApiError
   */
  public static supportedCryptocurrencies(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<Array<CurrencyDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/cryptocurrencies",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Returns a list of all fiat currencies supported by Noba Onramp
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns CurrencyDTO List of all supported fiat currencies
   * @throws ApiError
   */
  public static supportedFiatCurrencies(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<Array<CurrencyDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/fiatcurrencies",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Returns a list of all countries supported by Noba Onramp
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param includeSubdivisions Include subdivision data
   * @returns LocationDTO Location details of supported countries, optionally including subdivision data
   * @throws ApiError
   */
  public static getSupportedCountries(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    includeSubdivisions?: boolean,
  ): CancelablePromise<Array<LocationDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/countries",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      query: {
        includeSubdivisions: includeSubdivisions,
      },
    });
  }

  /**
   * Returns details of a country and its subdivisions supported by Noba Onramp
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param countryCode
   * @returns LocationDTO Location details of requested country
   * @throws ApiError
   */
  public static getSupportedCountry(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    countryCode: string,
  ): CancelablePromise<LocationDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/countries/{countryCode}",
      path: {
        countryCode: countryCode,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Country code not found`,
      },
    });
  }

  /**
   * Returns common api configurations
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns ConfigurationsDTO Common api configurations
   * @throws ApiError
   */
  public static getCommonConfigurations(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<ConfigurationsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/config",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Configurations not found`,
      },
    });
  }
}
