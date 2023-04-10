import { Inject, Injectable } from "@nestjs/common";
import { IPushTokenRepo } from "./repos/pushtoken.repo";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";

@Injectable()
export class PushTokenService {
  @Inject("PushTokenRepo")
  private readonly pushTokenRepo: IPushTokenRepo;

  async subscribeToPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    const existingPushTokenID = await this.pushTokenRepo.getPushToken(consumerID, pushToken);
    if (!existingPushTokenID) {
      return this.pushTokenRepo.addPushToken(consumerID, pushToken);
    }

    return existingPushTokenID;
  }

  async unsubscribeFromPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    const deletedPushTokenID = await this.pushTokenRepo.deletePushToken(consumerID, pushToken);
    if (!deletedPushTokenID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Failed to delete push token",
      });
    }

    return deletedPushTokenID;
  }

  async getPushTokensForConsumer(consumerID: string): Promise<string[]> {
    return this.pushTokenRepo.getAllPushTokensForConsumer(consumerID);
  }
}
