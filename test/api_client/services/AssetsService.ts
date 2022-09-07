/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfigurationsDTO } from "../models/ConfigurationsDTO";
import type { CreditCardDTO } from "../models/CreditCardDTO";
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
  public static supportedCryptocurrencies({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<Array<CurrencyDTO>> {
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
   * @returns CurrencyDTO List of all supported fiat currencies
   * @throws ApiError
   */
  public static supportedFiatCurrencies({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<Array<CurrencyDTO>> {
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
   * @returns LocationDTO Location details of supported countries, optionally including subdivision data
   * @throws ApiError
   */
  public static getSupportedCountries({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    includeSubdivisions,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
    /**
     * Include subdivision data
     */
    includeSubdivisions?: boolean;
  }): CancelablePromise<Array<LocationDTO>> {
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
   * @returns LocationDTO Location details of requested country
   * @throws ApiError
   */
  public static getSupportedCountry({
    xNobaApiKey,
    countryCode,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    countryCode: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<LocationDTO> {
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
   * @returns ConfigurationsDTO Common api configurations
   * @throws ApiError
   */
  public static getCommonConfigurations({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConfigurationsDTO> {
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

  /**
   * Returns credit card structure metadata for the provided BIN
   * @returns CreditCardDTO Card metadata
   * @throws ApiError
   */
  public static getCreditCardBin({
    xNobaApiKey,
    bin,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    bin: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<CreditCardDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/creditcardmetadata/{bin}",
      path: {
        bin: bin,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Credit card information not found`,
      },
    });
  }
}
