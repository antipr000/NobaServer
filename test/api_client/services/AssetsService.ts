/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyDTO } from "../models/CurrencyDTO";
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
   * Get price of a crypto (leg1) in fiat (leg 2)
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
   * Get the processing fee for a crypto fiat conversion
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
