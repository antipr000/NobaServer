import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { Logger } from "winston";
import { CircleClient } from "./circle.client";
import { ICircleRepo } from "./repos/CircleRepo";

@Injectable()
export class CircleService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("CircleRepo")
  private readonly circleRepo: ICircleRepo;

  @Inject()
  private readonly circleClient: CircleClient;

  public async getOrCreateWallet(consumerID: string): Promise<string> {
    // assume there's only one wallet per consumer ID
    const existingWalletResult = await this.circleRepo.getCircleWalletID(consumerID);
    if (existingWalletResult.isSuccess) {
      return existingWalletResult.getValue();
    }

    const circleWalletID: string = await this.circleClient.createWallet(consumerID);

    try {
      // TODO: Should we even handle repo errors here or let them bubble up?
      await this.circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
    } catch (err) {
      // TODO: What if this fails? a wallet was created but not linked to the consumer
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

  public async debitWalletBalance(idempotencyKey: string, walletID: string, amount: number): Promise<number> {
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
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: walletID,
      destinationWalletID: masterWalletID,
      amount: amount,
    });

    return response.updatedBalance;
  }

  public async creditWalletBalance(idempotencyKey: string, walletID: string, amount: number): Promise<number> {
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
    const response = await this.circleClient.transfer({
      idempotencyKey: idempotencyKey,
      sourceWalletID: masterWalletID,
      destinationWalletID: walletID,
      amount: amount,
    });

    return response.updatedBalance;
  }
}
