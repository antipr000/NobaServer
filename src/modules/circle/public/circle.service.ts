import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CircleClient } from "./circle.client";
import { ICircleRepo } from "../repos/circle.repo";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { UpdateWalletBalanceServiceDTO } from "../../../modules/psp/domain/UpdateWalletBalanceServiceDTO";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../../../modules/psp/domain/BankFactoryTypes";
import { BalanceDTO } from "../../../modules/psp/dto/balance.dto";
import { IBank } from "../../../modules/psp/factory/ibank";
import { CircleTransferStatus, TransferResponse } from "../../../modules/psp/domain/CircleTypes";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { AlertKey } from "../../../modules/common/alerts/alert.dto";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class CircleService implements IBank {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("CircleRepo")
  private readonly circleRepo: ICircleRepo;

  @Inject()
  private readonly circleClient: CircleClient;

  @Inject()
  private readonly alertService: AlertService;

  public async checkCircleHealth(): Promise<HealthCheckResponse> {
    return this.circleClient.getHealth();
  }

  public async getOrCreateWallet(consumerID: string): Promise<string> {
    if (!consumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer ID must not be empty",
      });
    }

    // assume there's only one wallet per consumer ID
    const existingWalletResult = await this.circleRepo.getCircleWalletID(consumerID);
    if (existingWalletResult.isSuccess) {
      return existingWalletResult.getValue();
    }

    const circleWalletID: string = await this.circleClient.createWallet(consumerID);

    try {
      await this.circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
    } catch (err) {
      this.logger.error(`Could not link Circle wallet to consumerID: ${consumerID}. Error:  ${JSON.stringify(err)}`);
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Could not link Circle wallet to consumer",
      });
    }
    return circleWalletID;
  }

  public getMasterWalletID(): string {
    const masterWalletID = this.circleClient.getMasterWalletID();
    if (!masterWalletID) {
      throw new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST, message: "Master Wallet not found" });
    }
    return masterWalletID;
  }

  public async getWalletBalance(walletID: string): Promise<number> {
    if (!walletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Wallet ID must not be empty",
      });
    }

    return this.circleClient.getWalletBalance(walletID);
  }

  public async debitWalletBalance(
    idempotencyKey: string,
    walletID: string,
    amount: number,
  ): Promise<UpdateWalletBalanceServiceDTO> {
    if (!walletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Wallet ID must not be empty",
      });
    }

    if (amount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Amount must be greater than 0",
      });
    }

    const balance = await this.circleClient.getWalletBalance(walletID);
    if (balance < amount) {
      throw new ServiceException({
        message: "Insufficient funds",
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        retry: false,
      });
    }

    const masterWalletID = this.getMasterWalletID();
    this.logger.info(`Transferring ${amount} from wallet ${walletID} to master wallet ${masterWalletID}`);
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: walletID,
      destinationWalletID: masterWalletID,
      amount: amount,
    });

    if (
      response.status !== CircleTransferStatus.TRANSFER_FAILED &&
      response.status !== CircleTransferStatus.INSUFFICIENT_FUNDS
    ) {
      try {
        if (walletID !== masterWalletID) {
          this.logger.info(
            `Updating balance for wallet ${walletID} to ${Utils.roundTo2DecimalNumber(balance - amount)}`,
          );
          await this.circleRepo.updateCurrentBalance(walletID, Utils.roundTo2DecimalNumber(balance - amount));
        }
      } catch (e) {
        this.alertService.raiseAlert({
          key: AlertKey.CIRCLE_BALANCE_UPDATE_FAILED,
          message: `Could not update balance for wallet ${walletID}. Reason: ${JSON.stringify(e)}`,
        });
      }
    }

    return {
      id: response.transferID,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  public async creditWalletBalance(
    idempotencyKey: string,
    walletID: string,
    amount: number,
  ): Promise<UpdateWalletBalanceServiceDTO> {
    if (!walletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Wallet ID must not be empty",
      });
    }

    if (amount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Amount must be greater than 0",
      });
    }

    const masterWalletID = this.getMasterWalletID();
    const masterWalletBalance = await this.getWalletBalance(masterWalletID);
    if (masterWalletBalance < amount) {
      this.logger.error(`Insufficient funds in master wallet (have: ${masterWalletBalance}, need: ${amount})`);

      throw new ServiceException({
        message: "Insufficient funds in master wallet",
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        retry: false,
      });
    }

    this.logger.info(`Transferring ${amount} from master wallet to ${walletID}`);
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: masterWalletID,
      destinationWalletID: walletID,
      amount: amount,
    });

    if (response.status !== CircleTransferStatus.TRANSFER_FAILED) {
      try {
        const currentBalance = await this.circleClient.getWalletBalance(walletID);
        if (walletID !== masterWalletID) {
          this.logger.info(`Updating balance for wallet ${walletID} to ${Utils.roundTo2DecimalNumber(currentBalance)}`);
          await this.circleRepo.updateCurrentBalance(walletID, Utils.roundTo2DecimalNumber(currentBalance));
        }
      } catch (e) {
        this.alertService.raiseAlert({
          key: AlertKey.CIRCLE_BALANCE_UPDATE_FAILED,
          message: `Could not update balance for wallet ${walletID}. Reason: ${JSON.stringify(e)}`,
        });
      }
    }

    return {
      id: response.transferID,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  public async transferFunds(
    idempotencyKey: string,
    sourceWalletID: string,
    destinationWalletID: string,
    amount: number,
  ): Promise<UpdateWalletBalanceServiceDTO> {
    if (!sourceWalletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Source Wallet ID must not be empty",
      });
    }

    if (!destinationWalletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Destination Wallet ID must not be empty",
      });
    }

    if (amount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Amount must be greater than 0",
      });
    }

    const balance = await this.circleClient.getWalletBalance(sourceWalletID);
    if (balance < amount) {
      throw new ServiceException({
        message: "Insufficient funds",
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        retry: false,
      });
    }

    this.logger.info(`Transferring ${amount} from ${sourceWalletID} to ${destinationWalletID}`);
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: sourceWalletID,
      destinationWalletID: destinationWalletID,
      amount: amount,
    });

    if (
      response.status !== CircleTransferStatus.TRANSFER_FAILED &&
      response.status !== CircleTransferStatus.INSUFFICIENT_FUNDS
    ) {
      try {
        const masterWalletID = this.getMasterWalletID();
        if (sourceWalletID !== masterWalletID) {
          this.logger.info(
            `Updating balance for wallet ${sourceWalletID} to ${Utils.roundTo2DecimalNumber(balance - amount)}`,
          );
          await this.circleRepo.updateCurrentBalance(sourceWalletID, Utils.roundTo2DecimalNumber(balance - amount));
        }

        if (destinationWalletID !== masterWalletID) {
          const destinationCurrentBalance = await this.circleClient.getWalletBalance(destinationWalletID);
          await this.circleRepo.updateCurrentBalance(
            destinationWalletID,
            Utils.roundTo2DecimalNumber(destinationCurrentBalance),
          );
        }
      } catch (e) {
        this.alertService.raiseAlert({
          key: AlertKey.CIRCLE_BALANCE_UPDATE_FAILED,
          message: `Could not update balance for wallet ${sourceWalletID} or ${destinationWalletID}. Reason: ${JSON.stringify(
            e,
          )}`,
        });
      }
    }

    return {
      id: response.transferID,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  public async getBalance(walletID: string, forceRefresh = false): Promise<BalanceDTO> {
    if (!walletID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Wallet ID must not be empty",
      });
    }

    let balance: number;
    if (!forceRefresh) {
      balance = await this.circleRepo.getCircleBalance(walletID);
      if (balance !== null) {
        // It is cached, return it
        return {
          balance: balance,
          currency: "USD",
        };
      }
    }

    // It is not cached or force refresh is requested, fetch it from Circle
    balance = await this.circleClient.getWalletBalance(walletID);
    // Cache it
    const roundedBalance = Utils.roundTo2DecimalNumber(balance);
    try {
      const masterWalletID = this.getMasterWalletID();
      if (walletID !== masterWalletID) {
        await this.circleRepo.updateCurrentBalance(walletID, roundedBalance);
      }
    } catch (e) {
      this.alertService.raiseAlert({
        key: AlertKey.CIRCLE_BALANCE_UPDATE_FAILED,
        message: `Could not update balance for wallet ${walletID}. Reason: ${JSON.stringify(e)}`,
      });
    }

    return {
      balance: roundedBalance,
      currency: "USD",
    };
  }

  public async getTransferStatus(
    idempotencyKey: string,
    sourceWalletID: string,
    destinationWalletID: string,
    amount: number,
  ): Promise<CircleTransferStatus> {
    // Trying out same transfer but with Noba Master Wallet IDs in credit & debit side.
    // This will help avoid the scenario where the original txn never reached Circle before
    // and this status check call actually lead to a txn on the user's wallet.
    const masterWalletID: string = this.getMasterWalletID();
    const transferResponse: TransferResponse = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: masterWalletID,
      destinationWalletID: masterWalletID,
      amount: 1,
    });

    // If txn happend with Noba IDs then it is a brand new txn and previous txn never reached Circle.
    if (
      transferResponse.sourceWalletID === masterWalletID &&
      transferResponse.destinationWalletID === masterWalletID &&
      transferResponse.amount === 1
    ) {
      return CircleTransferStatus.TRANSFER_FAILED;
    }
    // The previous txn reached circle and hence the data doesn't match the one sent in the request.
    // Therefore, the status would be the one specified in the response.
    if (
      transferResponse.sourceWalletID === sourceWalletID &&
      transferResponse.destinationWalletID === destinationWalletID &&
      transferResponse.amount === amount
    ) {
      return transferResponse.status;
    }

    this.alertService.raiseAlert({
      key: AlertKey.UNEXPECTED_TRANSFER_CHECK,
      message: `Unexpected 'getTransferStatus' requested ('${idempotencyKey}', '${sourceWalletID}', '${destinationWalletID}', '${amount}')`,
    });
    return CircleTransferStatus.TRANSFER_FAILED;
  }

  debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    throw new Error("Method not implemented.");
  }
}
