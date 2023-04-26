import { Inject } from "@nestjs/common";
import { PushNotificationPayload } from "../domain/PushNotificationTypes";
import { PushClient } from "./push.client";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { Logger } from "winston";
import { pushNotificationTitleTemplates } from "./templates.push";

export class ExpoPushClient extends PushClient {
  private readonly expo: Expo;

  constructor(@Inject() logger: Logger) {
    super(logger);
    this.expo = new Expo();
  }

  async sendPushNotificationInternal(request: PushNotificationPayload): Promise<void> {
    const title = pushNotificationTitleTemplates[request.templateKey]();

    const message: ExpoPushMessage = {
      to: request.token,
      title: title,
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
        this.logger.error(`Failed to send push notification. Reason: ${e.message}`);
      }
    }
  }
}
