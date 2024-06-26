import { Inject, Injectable, Logger } from "@nestjs/common";
import { IExchangeRateRepo } from "./repo/exchangerate.repo";
import { ExchangeRatePair, InputExchangeRate } from "./domain/ExchangeRate";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { AlertKey } from "../common/alerts/alert.dto";
import { AlertService } from "../common/alerts/alert.service";
import { ExchangeRateDTO } from "./dto/exchangerate.dto";
import { ExchangeRateClientFactory } from "./factory/exchangerate.factory";

@Injectable()
export class ExchangeRateService {
  private readonly exchangeRatePairs: ExchangeRatePair[] = [
    {
      numeratorCurrency: "USD",
      denominatorCurrency: "COP",
    },
    {
      numeratorCurrency: "COP",
      denominatorCurrency: "USD",
    },
  ];

  @Inject("ExchangeRateRepo")
  private readonly exchangeRateRepo: IExchangeRateRepo;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly alertService: AlertService;

  @Inject()
  private readonly exchangeRateClientFactory: ExchangeRateClientFactory;

  async createExchangeRate(exchangeRateDTO: ExchangeRateDTO): Promise<ExchangeRateDTO> {
    // If nobaRate is not provided, use bankRate
    if (exchangeRateDTO.nobaRate == null) {
      exchangeRateDTO.nobaRate = exchangeRateDTO.bankRate;
    }

    // Default the expiration timestamp to 1 day
    if (exchangeRateDTO.expirationTimestamp == null) {
      exchangeRateDTO.expirationTimestamp = new Date(Date.now() + 36 * 60 * 60 * 1000); // 36 hours from now
    }

    const exchangeRate: InputExchangeRate = {
      numeratorCurrency: exchangeRateDTO.numeratorCurrency,
      denominatorCurrency: exchangeRateDTO.denominatorCurrency,
      bankRate: exchangeRateDTO.bankRate,
      nobaRate: exchangeRateDTO.nobaRate,
      expirationTimestamp: exchangeRateDTO.expirationTimestamp,
    };

    try {
      const createdExchangeRate = await this.exchangeRateRepo.createExchangeRate(exchangeRate);
      if (createdExchangeRate == null) return null;
      return {
        numeratorCurrency: createdExchangeRate.numeratorCurrency,
        denominatorCurrency: createdExchangeRate.denominatorCurrency,
        bankRate: createdExchangeRate.bankRate,
        nobaRate: createdExchangeRate.nobaRate,
        expirationTimestamp: createdExchangeRate.expirationTimestamp,
      };
    } catch (err) {
      this.logger.warn(`Error creating exchangeRate in database: ${err} - ${JSON.stringify(exchangeRate)}`);
      throw new ServiceException({
        error: err,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: err.message,
        retry: false,
      });
    }
  }

  async createExchangeRateFromProvider(): Promise<ExchangeRateDTO[]> {
    const exchangeRates: Promise<ExchangeRateDTO>[] = [];
    const errorMessages: string[] = [];

    for (const exchangeRatePair of this.exchangeRatePairs) {
      const currencyPairText = `${exchangeRatePair.numeratorCurrency}-${exchangeRatePair.denominatorCurrency}`;
      const exchangeRateClient = this.exchangeRateClientFactory.getExchangeRateClientByCurrencyPair(
        exchangeRatePair.numeratorCurrency,
        exchangeRatePair.denominatorCurrency,
      );
      if (!exchangeRateClient) {
        const errorMessage = `No exchange rate client found for currency pair "${currencyPairText}"`;
        this.logger.warn(errorMessage);
        errorMessages.push(errorMessage);
        continue;
      }

      let exchangeRate;
      try {
        exchangeRate = await exchangeRateClient.getExchangeRate(
          exchangeRatePair.numeratorCurrency,
          exchangeRatePair.denominatorCurrency,
        );
      } catch (err) {
        const errorMessage = `Error getting exchange rate from provider for currency pair "${currencyPairText}": ${err}`;
        this.logger.warn(errorMessage);
        errorMessages.push(errorMessage);
        continue;
      }

      if (!exchangeRate) {
        const errorMessage = `No exchange rate found for currency pair "${currencyPairText}": "${exchangeRate}"`;
        this.logger.warn(errorMessage);
        errorMessages.push(errorMessage);
        continue;
      }

      const existingExchangeRate = await this.exchangeRateRepo.getExchangeRateForCurrencyPair(
        exchangeRatePair.numeratorCurrency,
        exchangeRatePair.denominatorCurrency,
      );

      if (
        existingExchangeRate &&
        (exchangeRate < existingExchangeRate.bankRate * 0.9 || exchangeRate > existingExchangeRate.bankRate * 1.1)
      ) {
        const errorMessage = `Exchange rate from provider for currency pair "${currencyPairText}" is outside of the 10% threshold of existing exchange rate. Provider: ${exchangeRate} Existing: ${existingExchangeRate.bankRate}`;
        this.logger.warn(errorMessage);
        errorMessages.push(errorMessage);
        continue;
      }

      exchangeRates.push(
        this.createExchangeRate({
          numeratorCurrency: exchangeRatePair.numeratorCurrency,
          denominatorCurrency: exchangeRatePair.denominatorCurrency,
          bankRate: exchangeRate,
          nobaRate: null,
          expirationTimestamp: new Date(Date.now() + 25 * 60 * 60 * 1000),
        }),
      );
    }

    if (errorMessages.length > 0) {
      this.alertService.raiseCriticalAlert({
        key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED,
        message: errorMessages.join("\n"),
      });
    }

    return Promise.all(exchangeRates);
  }

  // 1 numeratorCurrency = X denominatorCurrency
  async getExchangeRateForCurrencyPair(
    numeratorCurrency: string,
    denominatorCurrency: string,
  ): Promise<ExchangeRateDTO> {
    // Clean existing otps for identifier if any
    const date = new Date();
    try {
      let rate = await this.exchangeRateRepo.getExchangeRateForCurrencyPair(
        numeratorCurrency,
        denominatorCurrency,
        date,
      );

      if (rate == null) {
        rate = await this.exchangeRateRepo.getExchangeRateForCurrencyPair(numeratorCurrency, denominatorCurrency);
        this.alertService.raiseCriticalAlert({
          key: AlertKey.STALE_FX_RATES,
          message: `No exchange rate found for currency pair "${numeratorCurrency}-${denominatorCurrency}" that is not expired. Using rate that expired on ${rate.expirationTimestamp.toISOString()} with values of: bankRate=${
            rate.bankRate
          }, nobaRate=${rate.nobaRate}`,
        });
      }

      return {
        numeratorCurrency: rate.numeratorCurrency,
        denominatorCurrency: rate.denominatorCurrency,
        bankRate: rate.bankRate,
        nobaRate: rate.nobaRate,
        expirationTimestamp: rate.expirationTimestamp,
      };
    } catch (err) {
      this.logger.warn(
        `Error getting exchange rate from database for currency pair "${numeratorCurrency}-${denominatorCurrency}": ${err}`,
      );
      return null;
    }
  }
}
