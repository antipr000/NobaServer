import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { IExchangeRateClient } from "../clients/exchangerate.client";
import { ExchangeRateName } from "../domain/ExchangeRate";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";

@Injectable()
export class ExchangeRateClientFactory {
  @Inject()
  private readonly stubClient: StubExchangeRateClient;

  @Inject()
  private readonly exchangerateioClient: ExchangeRateIOExchangeRateClient;

  getExchangeRateClient(exchangeRateName: ExchangeRateName): IExchangeRateClient {
    switch (exchangeRateName) {
      case ExchangeRateName.STUB:
        return this.stubClient;
      case ExchangeRateName.EXCHANGERATEIO:
        return this.exchangerateioClient;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported exchange rate client",
        });
    }
  }

  getExchangeRateClientByCurrencyPair(numeratorCurrency: string, denominatorCurrency: string): IExchangeRateClient {
    if (numeratorCurrency === "USD" && denominatorCurrency === "COP") {
      return this.exchangerateioClient;
    } else if (numeratorCurrency === "COP" && denominatorCurrency === "USD") {
      return this.exchangerateioClient;
    } else {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "No supported exchange rate client for currency pair",
      });
    }
  }
}
