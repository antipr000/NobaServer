import { Circle, CircleEnvironments, CreateWalletResponse, TransferErrorCode } from "@circle-fin/circle-sdk";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CircleConfigs } from "../../config/configtypes/CircleConfigs";
import { CIRCLE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { AxiosResponse } from "axios";
import { CircleWithdrawalRequest, CircleWithdrawalResponse, CircleWithdrawalStatusMap } from "./domain/CircleTypes";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { Utils } from "../../core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { IClient } from "../../core/domain/IClient";
import { HealthCheckResponse, HealthCheckStatus } from "../../core/domain/HealthCheckTypes";

@Injectable()
export class CircleClient implements IClient {
  private readonly circleApi: Circle;
  private readonly masterWalletID: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const circleConfigs: CircleConfigs = configService.get<CircleConfigs>(CIRCLE_CONFIG_KEY);
    this.circleApi = new Circle(circleConfigs.apiKey, CircleEnvironments[circleConfigs.env]);
    this.masterWalletID = circleConfigs.masterWalletID;
  }

  async getHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await this.circleApi.health.ping();
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
      const walletData = await this.circleApi.wallets.getWallet(walletID);
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
