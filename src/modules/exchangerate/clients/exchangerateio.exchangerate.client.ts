import { Inject, Injectable } from "@nestjs/common";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { IExchangeRateClient } from "./exchangerate.client";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EXCHANGERATEIO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { ExchangeRateIOConfigs } from "../../../config/configtypes/exchangerateio.configs";
import axios, { AxiosRequestConfig } from "axios";

@Injectable()
export class ExchangeRateIOExchangeRateClient implements IExchangeRateClient {
  private readonly BASE_URL: string = "https://api.apilayer.com/exchangerates_data";
  private readonly axiosConfig: AxiosRequestConfig;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const exchangeRateIOConfigs: ExchangeRateIOConfigs =
      configService.get<ExchangeRateIOConfigs>(EXCHANGERATEIO_CONFIG_KEY);
    this.BASE_URL = exchangeRateIOConfigs.baseURL;
    this.axiosConfig = {
      params: {
        apikey: exchangeRateIOConfigs.apiKey,
      },
    };
  }

  getHealth(): Promise<HealthCheckResponse> {
    throw new Error("Method not implemented.");
  }

  async getExchangeRate(numeratorCurrency: string, denominatorCurrency: string): Promise<number> {
    const response = await axios.get(
      `${this.BASE_URL}/latest?symbols=${numeratorCurrency}&base=${denominatorCurrency}`,
      this.axiosConfig,
    );

    return response.data.rates[numeratorCurrency];
  }
}
