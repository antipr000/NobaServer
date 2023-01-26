import { Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationService } from "./notification.service";
import { CommonModule } from "../common/common.module";
import { EmailEventHandler } from "./email.event.handler";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DEPENDENCY_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { DependencyConfigs, EmailClient, SMSClient } from "../../config/configtypes/DependencyConfigs";
import { StubEmailService } from "./emails/stub.email.service";
import { SendgridEmailService } from "./emails/sendgrid.email.service";
import { SMSEventHandler } from "./sms.event.handler";
import { StubSMSService } from "./sms/stub.sms.service";
import { TwilioSMSService } from "./sms/twilio.sms.service";

// This is made to ensure that the "Sendgrid" quota is not utilised in testing environments.
export const EmailProvider: Provider = {
  provide: "EmailService",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).emailClient) {
      case EmailClient.STUB:
        return new StubEmailService(logger);

      case EmailClient.SENDGRID:
        return new SendgridEmailService(customConfigService, logger);

      default:
        throw Error("Unexpected Email client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

export const SMSProvider: Provider = {
  provide: "SMSService",
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    switch (customConfigService.get<DependencyConfigs>(DEPENDENCY_CONFIG_KEY).smsClient) {
      case SMSClient.STUB:
        return new StubSMSService(logger);

      case SMSClient.TWILIO:
        return new TwilioSMSService(customConfigService);

      default:
        throw Error("Unexpected Email client.");
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

@Module({
  imports: [ConfigModule, CommonModule],
  controllers: [],
  providers: [NotificationService, EmailEventHandler, SMSEventHandler, EmailProvider, SMSProvider],
  exports: [NotificationService],
})
export class NotificationsModule {}
