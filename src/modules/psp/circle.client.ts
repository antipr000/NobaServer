import {
  Circle,
  CircleEnvironments,
  CreateWalletResponse,
  GetWalletResponse,
  TransferErrorCode,
} from "@circle-fin/circle-sdk";
import { Inject, InternalServerErrorException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CircleConfigs } from "../../config/configtypes/CircleConfigs";
import { CIRCLE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { AxiosResponse } from "axios";
import { CircleWithdrawalRequest, CircleWithdrawalResponse, CircleWithdrawalStatusMap } from "./domain/CircleTypes";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { Utils } from "src/core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "src/core/exception/ServiceException";

export class CircleClient {
  private readonly circleApi: Circle;
  private readonly masterWalletID: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const circleConfigs: CircleConfigs = configService.get<CircleConfigs>(CIRCLE_CONFIG_KEY);
    this.circleApi = new Circle(circleConfigs.apiKey, CircleEnvironments[circleConfigs.env]);
    this.masterWalletID = circleConfigs.masterWalletID;
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
        `Error while creating the wallet: ${JSON.stringify(err.response.data)}, ${JSON.stringify(
          err.response.headers,
        )}`,
      );
      throw new ServiceException(ServiceErrorCode.UNKNOWN, "Service unavailable. Please try again.");
    }
  }

  // It is assumed that Circle is used to store "only" USD balance.
  async getWalletBalance(walletID: string): Promise<number> {
    try {
      const walletData = await this.circleApi.wallets.getWallet(walletID);
      this.logger.info(`"getWallet" succeeds with request_id: "${walletData.headers["X-Request-Id"]}"`);

      let result: number = 0;
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
        `Error while creating the wallet: ${JSON.stringify(err.response.data)}, ${JSON.stringify(
          err.response.headers,
        )}`,
      );
      throw new ServiceException(ServiceErrorCode.UNKNOWN, "Service unavailable. Please try again.");
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
          currentBalance: request.amount,
          updatedBalance: Number(transferData.amount.amount),
          status: CircleWithdrawalStatusMap[transferData.status],
        };
      }

      switch (transferData.errorCode) {
        case TransferErrorCode.TransferFailed:
          throw new ServiceException(ServiceErrorCode.UNKNOWN);
        case TransferErrorCode.TransferDenied:
          throw new ServiceException(); // Not sure what exception this error represents
        case TransferErrorCode.BlockchainError:
          throw new ServiceException();
        case TransferErrorCode.InsufficientFunds:
          throw new ServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    } catch (err) {
      this.logger.error(
        `Error while transferring funds: ${JSON.stringify(err.response.data)},
        )}`,
      );
      throw new ServiceException(ServiceErrorCode.UNKNOWN, "Service unavailable. Please try again.");
    }
  }
}
