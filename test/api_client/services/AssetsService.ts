/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfigurationsDTO } from "../models/ConfigurationsDTO";
import type { CurrencyDTO } from "../models/CurrencyDTO";
import type { LocationDTO } from "../models/LocationDTO";
import type { ProcessingFeeDTO } from "../models/ProcessingFeeDTO";

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

  /**
   * Gets price of a crypto (leg1) in fiat (leg 2)
   * @param fiatCurrencyCode
   * @param cryptoCurrencyCode
   * @returns any Fiat price (leg 2) for the desired crypto currency (leg1)
   * @throws ApiError
   */
  public static priceInFiat(fiatCurrencyCode: string, cryptoCurrencyCode: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/exchangerates/priceinfiat/{fiatCurrencyCode}",
      path: {
        fiatCurrencyCode: fiatCurrencyCode,
      },
      query: {
        cryptoCurrencyCode: cryptoCurrencyCode,
      },
      errors: {
        400: `Invalid currency code (fiat or crypto)`,
        503: `Unable to connect to underlying service provider`,
      },
    });
  }

  /**
   * Gets the processing fee for a crypto fiat conversion
   * @param fiatCurrencyCode
   * @param fiatAmount
   * @param cryptoCurrencyCode
   * @returns ProcessingFeeDTO Processing fee for given crypto fiat conversion
   * @throws ApiError
   */
  public static processingFee(
    fiatCurrencyCode: string,
    fiatAmount: number,
    cryptoCurrencyCode: string,
  ): CancelablePromise<ProcessingFeeDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/exchangerates/processingfee/{fiatCurrencyCode}",
      path: {
        fiatCurrencyCode: fiatCurrencyCode,
      },
      query: {
        fiatAmount: fiatAmount,
        cryptoCurrencyCode: cryptoCurrencyCode,
      },
      errors: {
        400: `Invalid currency code (fiat or crypto)`,
        503: `Unable to connect to underlying service provider`,
      },
    });
  }
}
