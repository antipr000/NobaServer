import { Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PartnerModule } from "../partner/partner.module";
import { NotificationService } from "./notification.service";
import { WebhookService } from "./webhook.service";
import { CommonModule } from "../common/common.module";
import { EventHandler } from "./event.handler";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DEPENDENCY_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { DependencyConfigs, EmailClient } from "../../config/configtypes/DependencyConfigs";
import { StubEmailService } from "./emails/stub.email.service";
import { SendgridEmailService } from "./emails/sendgrid.email.service";

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
        throw Error(`Unexpected Email client.`);
    }
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

@Module({
  imports: [ConfigModule, PartnerModule, CommonModule],
  controllers: [],
  providers: [NotificationService, EventHandler, WebhookService, EmailProvider],
  exports: [NotificationService],
})
export class NotificationsModule {}
