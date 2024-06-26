import { Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationService } from "./notification.service";
import { CommonModule } from "../common/common.module";
import { EmailEventHandler } from "./email.event.handler";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DEPENDENCY_CONFIG_KEY } from "../../config/ConfigurationUtils";
import {
  DashboardClient,
  DependencyConfigs,
  EmailClient,
  PushNotificationClient,
  SMSClient,
} from "../../config/configtypes/DependencyConfigs";
import { StubEmailClient } from "./emails/stub.email.client";
import { SendgridEmailClient } from "./emails/sendgrid.email.client";
import { SMSEventHandler } from "./sms.event.handler";
import { StubSMSClient } from "./sms/stub.sms.client";
import { TwilioSMSClient } from "./sms/twilio.sms.service";
import { NotificationRepoModule } from "./repos/notification.repo.module";
import { DashboardEventHandler } from "./dashboard.event.handler";
import { StubDashboardClient } from "./dashboard/stub.dashboard.client";
import { BubbleClient } from "./dashboard/bubble.client";
import { StubPushClient } from "./push/stub.push.client";
import { ExpoPushClient } from "./push/expo.push.client";
import { PushEventHandler } from "./push.event.handler";
import { PushTokenService } from "./push.token.service";

// This is made to ensure that the "Sendgrid" quota is not utilised in testing environments.
export const EmailProvider: Provider = {
  provide: "EmailClient",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).emailClient) {
      case EmailClient.STUB:
        return new StubEmailClient(logger);

      case EmailClient.SENDGRID:
        return new SendgridEmailClient(customConfigService, logger);

      default:
        throw Error("Unexpected Email client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

export const SMSProvider: Provider = {
  provide: "SMSClient",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).smsClient) {
      case SMSClient.STUB:
        return new StubSMSClient(logger);

      case SMSClient.TWILIO:
        return new TwilioSMSClient(customConfigService, logger);

      default:
        throw Error("Unexpected Email client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

export const DashboardProvider: Provider = {
  provide: "DashboardClient",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).dashboardClient) {
      case DashboardClient.STUB:
        return new StubDashboardClient(logger);

      case DashboardClient.BUBBLE:
        return new BubbleClient(customConfigService, logger);

      default:
        throw Error("Unexpected Email client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

export const PushNotificationProvider: Provider = {
  provide: "PushNotificationClient",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).pushClient) {
      case PushNotificationClient.STUB:
        return new StubPushClient(logger);

      case PushNotificationClient.EXPO:
        return new ExpoPushClient(logger);

      default:
        throw Error("Unexpected Push notification client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

@Module({
  imports: [ConfigModule, CommonModule, NotificationRepoModule],
  controllers: [],
  providers: [
    NotificationService,
    PushTokenService,
    EmailEventHandler,
    SMSEventHandler,
    DashboardEventHandler,
    PushEventHandler,
    EmailProvider,
    SMSProvider,
    DashboardProvider,
    PushNotificationProvider,
  ],
  exports: [NotificationService, PushTokenService],
})
export class NotificationsModule {}
