import { Inject } from "@nestjs/common";
import { PushNotificationPayload } from "../domain/PushNotificationTypes";
import { PushClient } from "./push.client";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { Logger } from "winston";

export class ExpoPushClient extends PushClient {
  private readonly expo: Expo;

  constructor(@Inject() logger: Logger) {
    super(logger);
    this.expo = new Expo();
  }

  async sendPushNotificationInternal(request: PushNotificationPayload): Promise<void> {
    const message: ExpoPushMessage = {
      to: request.token,
      title: request.title,
      body: request.body,
      sound: "default",
      data: {
        ...(request.notificationType && { notificationType: request.notificationType }),
        ...(request.transferCounterPartyHandle && { transferCounterPartyHandle: request.transferCounterPartyHandle }),
        ...(request.transactionRef && { transactionRef: request.transactionRef }),
      },
    };

    const chunks = this.expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (e) {
        this.logger.warn(`Failed to send push notification. Reason: ${e.message}`);
      }
    }
  }
}
