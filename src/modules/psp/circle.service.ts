import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "src/core/exception/ServiceException";
import { Logger } from "winston";
import { CircleClient } from "./circle.client";
import { Circle } from "./domain/Circle";
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
      await this.circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
    } catch (err) {
      // TODO: What if this fails?
      throw new ServiceException(ServiceErrorCode.UNKNOWN, "Could not link Circle wallet to consumer");
    }
    return circleWalletID;
  }

  public async getMasterWalletID(): Promise<string> {
    const masterWalletID = await this.circleClient.getMasterWalletID();
    if (!masterWalletID) {
      throw new ServiceException(ServiceErrorCode.DOES_NOT_EXIST, "Master Wallet not found");
    }
    return masterWalletID;
  }

  public async getWalletBalance(walletID: string): Promise<number> {
    if (!walletID) {
      throw new ServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "Wallet ID must not be empty");
    }

    return this.circleClient.getWalletBalance(walletID);
  }

  public async debitWalletBalance(idempotencyKey: string, walletID: string, amount: number): Promise<number> {
    const masterWalletID = await this.getMasterWalletID();
    const response = await this.circleClient.transfer({
      idempotencyKey,
      sourceWalletID: walletID,
      destinationWalletID: masterWalletID,
      amount,
    });

    return response.updatedBalance;
  }

  public async creditWalletBalance(idempotencyKey: string, walletID: string, amount: number): Promise<number> {
    const masterWalletID = await this.getMasterWalletID();
    const response = await this.circleClient.transfer({
      idempotencyKey,
      sourceWalletID: masterWalletID,
      destinationWalletID: walletID,
      amount,
    });

    return response.updatedBalance;
  }
}
