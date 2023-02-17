import { Circle, CircleEnvironments, CreateWalletResponse, TransferErrorCode } from "@circle-fin/circle-sdk";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CircleConfigs } from "../../config/configtypes/CircleConfigs";
import { AppEnvironment, CIRCLE_CONFIG_KEY, getEnvironmentName } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { CircleWithdrawalRequest, CircleWithdrawalResponse, CircleWithdrawalStatusMap } from "./domain/CircleTypes";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { Utils } from "../../core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { IClient } from "../../core/domain/IClient";
import { HealthCheckResponse, HealthCheckStatus } from "../../core/domain/HealthCheckTypes";
import tunnel from "tunnel";
import { Length } from "class-validator";

@Injectable()
export class CircleClient implements IClient {
  private readonly circleApi: Circle;
  private readonly masterWalletID: string;

  private httpsHttpAgent =
    getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST
      ? null
      : tunnel.httpsOverHttp({ proxy: { host: "http://172.31.8.170", port: "3128" } });

  private httpsHttpsAgent =
    getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST
      ? null
      : tunnel.httpsOverHttps({ proxy: { host: "https://172.31.8.170", port: "3129" } });

  /* private axiosConfig: AxiosRequestConfig = {
    httpsAgent: this.httpsAgent,
    httpAgent: this.httpAgent,
  };*/

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const circleConfigs: CircleConfigs = configService.get<CircleConfigs>(CIRCLE_CONFIG_KEY);
    this.circleApi = new Circle(circleConfigs.apiKey, CircleEnvironments[circleConfigs.env]);
    this.masterWalletID = circleConfigs.masterWalletID;
  }

  async getHealth(): Promise<HealthCheckResponse> {
    let response;
    try {
      response = await this.circleApi.health.ping({
        httpsAgent: tunnel.httpsOverHttps({ proxy: { host: "https://172.31.8.170", port: "3129" } }),
        httpAgent: tunnel.httpsOverHttp({ proxy: { host: "http://172.31.8.170", port: "3128" } }),
      });
      this.logger.error(`Response 1: ${JSON.stringify(response)}`);
    } catch (e) {
      this.logger.error(`Error 1: ${JSON.stringify(e)}`);
    }

    try {
      response = await this.circleApi.health.ping({
        proxy: {
          protocol: "https",
          host: "172.31.8.170",
          port: 3129,
        },
      });
      this.logger.error(`Response 2: ${JSON.stringify(response)}`);
    } catch (e) {
      this.logger.error(`Error 2: ${JSON.stringify(e)}`);
    }

    try {
      response = await this.circleApi.health.ping({
        proxy: {
          protocol: "http",
          host: "172.31.8.170",
          port: 3128,
        },
      });
      this.logger.error(`Response 3: ${JSON.stringify(response)}`);
    } catch (e) {
      this.logger.error(`Error 3: ${JSON.stringify(e)}`);
    }

    try {
      response = await this.circleApi.health.ping({
        httpsAgent: tunnel.httpOverHttps({ proxy: { host: "https://172.31.8.170", port: "3129" } }),
        httpAgent: tunnel.httpOverHttp({ proxy: { host: "http://172.31.8.170", port: "3128" } }),
      });
      this.logger.error(`Response 4: ${JSON.stringify(response)}`);
    } catch (e) {
      this.logger.error(`Error 4: ${JSON.stringify(e)}`);
    }

    if (response.status === HttpStatus.OK) {
      return {
        status: HealthCheckStatus.OK,
      };
    } else {
      return {
        status: HealthCheckStatus.UNAVAILABLE,
      };
    }
    /* } catch (e) {
      return {
        status: HealthCheckStatus.UNAVAILABLE,
      };
    }*/
  }

  async getMasterWalletID(): Promise<string> {
    return this.masterWalletID;
  }

  async createWallet(idempotencyKey: string): Promise<string> {
    try {
      const response: AxiosResponse<CreateWalletResponse> = await this.circleApi.wallets.createWallet({
        idempotencyKey: convertToUUIDv4(idempotencyKey),
        description: idempotencyKey,
      });

      this.logger.info(`"createWallet" succeeds with request_id: "${response.headers["X-Request-Id"]}"`);
      return response.data.data.walletId;
    } catch (err) {
      this.logger.error(
        `Error while creating the wallet: ${JSON.stringify(err.response?.data)}, ${JSON.stringify(
          err.response?.headers,
        )}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Service unavailable. Please try again.",
      });
    }
  }

  // It is assumed that Circle is used to store "only" USD balance.
  async getWalletBalance(walletID: string): Promise<number> {
    try {
      const walletData = await this.circleApi.wallets.getWallet(walletID, {
        proxy: {
          protocol: "https",
          host: "172.31.8.170",
          port: 3128,
        },
      });
      this.logger.info(`"getWallet" succeeds with request_id: "${walletData.headers["X-Request-Id"]}"`);

      let result = 0;
      walletData.data.data.balances.forEach(balance => {
        if (balance.currency === "USD") {
          result = Number(balance.amount);
        } else {
          this.logger.error(`Circle returns an invalid currency for wallet "${walletID}": ${JSON.stringify(balance)}`);
        }
      });

      return result;
    } catch (err) {
      this.logger.error(
        `Error while retrieving wallet balance: ${JSON.stringify(err.response.data)}, ${JSON.stringify(
          err.response.headers,
        )}`,
      );

      if (err.response.status === 429) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.RATE_LIMIT_EXCEEDED,
          message: "Rate limit exceeded. Please try again later.",
          retry: true,
        });
      }

      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Service unavailable. Please try again.",
      });
    }
  }

  async transfer(request: CircleWithdrawalRequest): Promise<CircleWithdrawalResponse> {
    try {
      const transferResponse = await this.circleApi.transfers.createTransfer({
        idempotencyKey: request.idempotencyKey,
        source: { id: request.sourceWalletID, type: "wallet" },
        destination: { id: request.destinationWalletID, type: "wallet" },
        amount: { amount: Utils.roundTo2DecimalString(request.amount), currency: "USD" },
      });

      const transferData = transferResponse.data.data;
      if (transferData.status !== "failed") {
        return {
          id: transferData.id,
          status: CircleWithdrawalStatusMap[transferData.status],
          createdAt: transferData.createDate,
        };
      }

      switch (transferData.errorCode) {
        case TransferErrorCode.TransferFailed:
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNKNOWN,
            message: `Transfer failed for idempotency key: ${request.idempotencyKey}`,
            retry: true,
          });
        case TransferErrorCode.TransferDenied:
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNKNOWN,
            message: `Transfer denied for idempotency key: ${request.idempotencyKey}`,
            retry: true,
          });
        case TransferErrorCode.BlockchainError:
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNKNOWN,
            message: `Blockchain error for idempotency key: ${request.idempotencyKey}`,
            retry: true,
          });
        case TransferErrorCode.InsufficientFunds:
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
            message: `Insufficient idempotency key: ${request.idempotencyKey}`,
          });
      }
    } catch (err) {
      this.logger.error(`Error while transferring funds: ${JSON.stringify(err.response?.data)}`);
      if (err instanceof ServiceException) {
        throw err;
      }

      if (err.response.status === 429) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.RATE_LIMIT_EXCEEDED,
          message: "Rate limit exceeded. Please try again later.",
          retry: true,
        });
      }

      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Service unavailable. Please try again.",
        retry: true,
      });
    }
  }
}
