import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
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
    // may want to return a Result object here as well
    // assume there's only one wallet per consumer ID
    const existingWalletResult = await this.circleRepo.getCircleWalletID(consumerID);
    if (existingWalletResult.isSuccess) {
      return existingWalletResult.getValue();
    } else {
      // TODO: Handle failure
    }

    const circleWalletID: string = await this.circleClient.createWallet(consumerID);

    await this.circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
    return circleWalletID;
  }

  public async getMasterWalletID(): Promise<string> {
    return this.circleClient.getMasterWalletID();
  }

  public async getWalletBalance(walletID: string): Promise<number> {
    // Stub

    return 100;
  }

  public async debitWalletBalance(walletID: string, amount: number): Promise<number> {
    // Stub

    return (await this.getWalletBalance(walletID)) - amount;
  }

  public async creditWalletBalance(walletID: string, amount: number): Promise<number> {
    // Stub

    return (await this.getWalletBalance(walletID)) + amount;
  }
}
