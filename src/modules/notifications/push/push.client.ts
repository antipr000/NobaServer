import { Logger } from "winston";
import { PushNotificationPayload } from "../domain/PushNotificationTypes";
import { PushData } from "../dto/LatestNotificationResponseDTO";

export abstract class PushClient {
  constructor(protected readonly logger: Logger) {}

  abstract sendPushNotificationInternal(request: PushNotificationPayload): Promise<void>;

  async sendPushNotification(request: PushNotificationPayload): Promise<void> {
    this.logger.info(`Sending push notification with following parameters: ${JSON.stringify(request)}`);
    try {
      await this.sendPushNotificationInternal(request);
    } catch (e) {
      this.logger.error(`Failed to send push notification. Reason: ${e.message}`);
    }
  }

  abstract getPreviousPushNotifications(): PushData[];

  abstract clearPreviousPushNotifications(): void;
}
