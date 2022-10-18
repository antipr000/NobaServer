import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { CheckoutService } from "./checkout.service";
import { PlaidClient } from "./plaid.client";

@Module({
  imports: [ConfigModule, CommonModule, NotificationsModule],
  controllers: [],
  providers: [CheckoutService, PlaidClient],
  exports: [CheckoutService, PlaidClient],
})
export class PspModule {}
