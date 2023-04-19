import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PushClient } from "./push.client";
import { PushNotificationPayload } from "../domain/PushNotificationTypes";
import { PushData } from "../dto/latestnotification.response.dto";

@Injectable()
export class StubPushClient extends PushClient {
  private pushNotificationData: PushData[] = [];

  constructor(@Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
  }

  async sendPushNotificationInternal(request: PushNotificationPayload): Promise<void> {
    this.logger.debug(`Faking the push notification sending with following parameters: ${JSON.stringify(request)}`);
    this.pushNotificationData.push(request);
  }

  getPreviousPushNotifications(): PushData[] {
    return this.pushNotificationData;
  }
  clearPreviousPushNotifications(): void {
    this.pushNotificationData = [];
  }
}
