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

  public async createWallet(
    consumerID: string,
  ): Promise<string> {
    const circleWalletID: string = await this.circleClient.createWallet(consumerID);

    await this.circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
    return circleWalletID;
  }
}
