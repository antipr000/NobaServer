import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { CardService } from "./card.service";
import { CheckoutService } from "./checkout.service";
import { PlaidClient } from "./plaid.client";

@Module({
  imports: [ConfigModule, CommonModule, NotificationsModule],
  controllers: [],
  providers: [CheckoutService, PlaidClient, CardService],
  exports: [CheckoutService, PlaidClient, CardService],
})
export class PspModule {}
