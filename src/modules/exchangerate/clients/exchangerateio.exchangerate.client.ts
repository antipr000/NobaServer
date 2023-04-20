import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { HealthCheckResponse, HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";
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

  async getHealth(): Promise<HealthCheckResponse> {
    const response = await axios.get(`${this.BASE_URL}/symbols`, this.axiosConfig);

    if (response.status === HttpStatus.OK && response.data.success) {
      return {
        status: HealthCheckStatus.OK,
      };
    }

    return {
      status: HealthCheckStatus.UNAVAILABLE,
    };
  }

  async getExchangeRate(numeratorCurrency: string, denominatorCurrency: string): Promise<number> {
    const response = await axios.get(
      `${this.BASE_URL}/latest?symbols=${denominatorCurrency}&base=${numeratorCurrency}`,
      this.axiosConfig,
    );

    return response.data.rates[numeratorCurrency];
  }
}
