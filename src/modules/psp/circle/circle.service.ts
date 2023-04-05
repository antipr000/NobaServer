import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Logger } from "winston";
import { CircleClient } from "./circle.client";
import { ICircleRepo } from "./../circle/repos/circle.repo";
import { UpdateWalletBalanceServiceDTO } from "./../domain/UpdateWalletBalanceServiceDTO";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { IBank } from "./../factory/ibank";
import { BalanceDTO } from "./../dto/balance.dto";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "./../domain/BankFactoryTypes";

@Injectable()
export class CircleService implements IBank {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("CircleRepo")
  private readonly circleRepo: ICircleRepo;

  @Inject()
  private readonly circleClient: CircleClient;

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

  public async getMasterWalletID(): Promise<string> {
    const masterWalletID = await this.circleClient.getMasterWalletID();
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

    const masterWalletID = await this.getMasterWalletID();
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: walletID,
      destinationWalletID: masterWalletID,
      amount: amount,
    });

    return {
      id: response.id,
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

    const masterWalletID = await this.getMasterWalletID();
    const masterWalletBalance = await this.getWalletBalance(masterWalletID);
    if (masterWalletBalance < amount) {
      this.logger.error(`Insufficient funds in master wallet (have: ${masterWalletBalance}, need: ${amount})`);

      throw new ServiceException({
        message: "Insufficient funds in master wallet",
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        retry: false,
      });
    }

    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: masterWalletID,
      destinationWalletID: walletID,
      amount: amount,
    });

    return {
      id: response.id,
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

    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: sourceWalletID,
      destinationWalletID: destinationWalletID,
      amount: amount,
    });

    return {
      id: response.id,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  public async getBalance(accountID: string): Promise<BalanceDTO> {
    return {
      balance: await this.getWalletBalance(accountID),
      currency: "USD",
    };
  }

  debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    throw new Error("Method not implemented.");
  }
}
