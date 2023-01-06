import { Inject, Injectable, Logger } from "@nestjs/common";
import { IExchangeRateRepo } from "./repo/exchangerate.repo";
import { ExchangeRateDTO } from "./dto/ExchangeRateDTO";
import { ExchangeRate, InputExchangeRate } from "./domain/ExchangeRate";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";

@Injectable()
export class ExchangeRateService {
  @Inject("ExchangeRateRepo")
  private readonly exchangeRateRepo: IExchangeRateRepo;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  async createExchangeRate(exchangeRateDTO: ExchangeRateDTO): Promise<ExchangeRateDTO> {
    // If nobaRate is not provided, use bankRate
    if (exchangeRateDTO.nobaRate == null) {
      exchangeRateDTO.nobaRate = exchangeRateDTO.bankRate;
    }

    // Default the expiration timestamp to 1 day
    if (exchangeRateDTO.expirationTimestamp == null) {
      exchangeRateDTO.expirationTimestamp = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
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
      this.logger.error(`Error creating exchangeRate in database: ${err} - ${JSON.stringify(exchangeRate)}`);
      return null;
    }
  }

  async getExchangeRateForCurrencyPair(
    numeratorCurrency: string,
    denominatorCurrency: string,
  ): Promise<ExchangeRateDTO> {
    // Clean existing otps for identifier if any
    try {
      const rate = await this.exchangeRateRepo.getExchangeRateForCurrencyPair(numeratorCurrency, denominatorCurrency);
      if (rate == null) return null;

      return {
        numeratorCurrency: rate.numeratorCurrency,
        denominatorCurrency: rate.denominatorCurrency,
        bankRate: rate.bankRate,
        nobaRate: rate.nobaRate,
        expirationTimestamp: rate.expirationTimestamp,
      };
    } catch (err) {
      this.logger.error(
        `Error getting exchange rate from database for currency pair "${numeratorCurrency}-${denominatorCurrency}": ${err}`,
      );
      return null;
    }
  }
}
