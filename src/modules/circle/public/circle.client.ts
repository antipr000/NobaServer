import {
  Circle,
  CircleEnvironments,
  CreateTransferResponse,
  TransferDestinationWalletLocation,
  CreateWalletResponse,
  Transfer,
  TransferErrorCode,
  TransferStatusEnum,
  TransferSourceWalletLocation,
} from "@circle-fin/circle-sdk";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CircleConfigs } from "../../../config/configtypes/CircleConfigs";
import { CIRCLE_CONFIG_KEY, NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { CircleTransferStatus, TransferRequest, TransferResponse } from "../../psp/domain/CircleTypes";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { Utils } from "../../../core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { IClient } from "../../../core/domain/IClient";
import { HealthCheckResponse, HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";
import { NobaConfigs } from "../../../config/configtypes/NobaConfigs";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class CircleClient implements IClient {
  private readonly circleApi: Circle;
  private readonly masterWalletID: string;

  private readonly axiosConfig: AxiosRequestConfig;

  @Inject()
  private readonly alertService: AlertService;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const circleConfigs: CircleConfigs = configService.get<CircleConfigs>(CIRCLE_CONFIG_KEY);
    this.circleApi = new Circle(circleConfigs.apiKey, CircleEnvironments[circleConfigs.env]);
    this.masterWalletID = circleConfigs.masterWalletID;
    this.axiosConfig = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).proxyIP
      ? {
          proxy: {
            protocol: "http",
            host: configService.get<NobaConfigs>(NOBA_CONFIG_KEY).proxyIP,
            port: configService.get<NobaConfigs>(NOBA_CONFIG_KEY).proxyPort,
          },
        }
      : {};
  }

  async getHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await this.circleApi.health.ping(this.axiosConfig);

      if (response.status === HttpStatus.OK) {
        return {
          status: HealthCheckStatus.OK,
        };
      } else {
        return {
          status: HealthCheckStatus.UNAVAILABLE,
        };
      }
    } catch (e) {
      return {
        status: HealthCheckStatus.UNAVAILABLE,
      };
    }
  }

  getMasterWalletID(): string {
    return this.masterWalletID;
  }

  async createWallet(idempotencyKey: string): Promise<string> {
    try {
      const response: AxiosResponse<CreateWalletResponse> = await this.circleApi.wallets.createWallet(
        {
          idempotencyKey: convertToUUIDv4(idempotencyKey),
          description: idempotencyKey,
        },
        this.axiosConfig,
      );

      return response.data.data.walletId;
    } catch (err) {
      this.alertService.raiseError(
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
      const walletData = await this.circleApi.wallets.getWallet(walletID, this.axiosConfig);

      let result = 0;
      walletData.data.data.balances.forEach(balance => {
        if (balance.currency === "USD") {
          result = Number(balance.amount);
        } else {
          this.alertService.raiseError(
            `Circle returns an invalid currency for wallet "${walletID}": ${JSON.stringify(balance)}`,
          );
        }
      });
      this.logger.info(`Wallet "${walletID}" balance: ${result}`);

      return result;
    } catch (err) {
      this.alertService.raiseError(
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

  async transfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      const transferResponse: AxiosResponse<CreateTransferResponse> = await this.circleApi.transfers.createTransfer(
        {
          idempotencyKey: convertToUUIDv4(request.idempotencyKey),
          source: { id: request.sourceWalletID, type: "wallet" },
          destination: { id: request.destinationWalletID, type: "wallet" },
          amount: { amount: Utils.roundTo2DecimalString(request.amount), currency: "USD" },
        },
        this.axiosConfig,
      );

      if (transferResponse.status !== 201) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNKNOWN,
          message: "Circle Transfer request failed.",
        });
      }

      const transferData: Transfer = transferResponse.data.data;
      const response: TransferResponse = {
        transferID: transferData.id,
        status: CircleTransferStatus.SUCCESS,
        createdAt: transferData.createDate,
        amount: Number(transferData.amount.amount),
        destinationWalletID: (transferData.destination as TransferDestinationWalletLocation).id,
        sourceWalletID: (transferData.source as TransferSourceWalletLocation).id,
      };

      if (transferData.status === TransferStatusEnum.Failed) {
        switch (transferData.errorCode) {
          case TransferErrorCode.TransferFailed:
            response.status = CircleTransferStatus.TRANSFER_FAILED;
            break;

          case TransferErrorCode.TransferDenied:
            response.status = CircleTransferStatus.TRANSFER_FAILED;
            break;

          case TransferErrorCode.BlockchainError:
            response.status = CircleTransferStatus.TRANSFER_FAILED;
            break;

          case TransferErrorCode.InsufficientFunds:
            response.status = CircleTransferStatus.INSUFFICIENT_FUNDS;
            break;
        }
      }
      return response;
    } catch (err) {
      this.alertService.raiseError(`Error while transferring funds: ${JSON.stringify(err.response?.data)}`);
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
