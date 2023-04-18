import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { IExchangeRateClient } from "../clients/exchangerate.client";
import { ExchangeRateName } from "../domain/ExchangeRate";

@Injectable()
export class ExchangeRateClientFactory {
  @Inject()
  private readonly stubClient: StubExchangeRateClient;

  getExchangeRateClient(exchangeRateName: ExchangeRateName): IExchangeRateClient {
    switch (exchangeRateName) {
      case ExchangeRateName.STUB:
        return this.stubClient;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported exchange rate client",
        });
    }
  }

  getExchangeRateClientByCurrencyPair(numeratorCurrency: string, denominatorCurrency: string): IExchangeRateClient {
    if (numeratorCurrency === "USD" && denominatorCurrency === "COP") {
      return this.stubClient;
    } else if (numeratorCurrency === "COP" && denominatorCurrency === "USD") {
      return this.stubClient;
    } else {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "No supported exchange rate client for currency pair",
      });
    }
  }
}
