import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PartnerModule } from "../partner/partner.module";
import { NotificationService } from "./notification.service";
import { EmailService } from "./email.service";
import { WebhookService } from "./webhook.service";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [ConfigModule, PartnerModule, CommonModule],
  controllers: [],
  providers: [NotificationService, EmailService, WebhookService],
  exports: [NotificationService],
})
export class NotificationsModule {}
