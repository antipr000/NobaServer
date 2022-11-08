import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PaymentService } from "./payment.service";
import { CheckoutClient } from "./checkout.client";
import { PlaidClient } from "./plaid.client";

@Module({
  imports: [ConfigModule, CommonModule, NotificationsModule],
  controllers: [],
  providers: [CheckoutClient, PlaidClient, PaymentService],
  exports: [CheckoutClient, PlaidClient, PaymentService],
})
export class PspModule {}
