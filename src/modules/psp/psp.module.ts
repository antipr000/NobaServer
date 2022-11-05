import { Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PaymentService } from "./payment.service";
import { CheckoutClient } from "./checkout.client";
import { PlaidClient } from "./plaid.client";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PaymentWebhooksController } from "./payment.webhook.controller";
import { CheckoutWebhooksMapper } from "./mapper/checkout.webhooks";

// This is made to ensure that the "webhooks" are correctly registered
// before the server starts processing the requests.
export const CheckoutClientProvider: Provider = {
  provide: CheckoutClient,
  useFactory: async (customConfigService: CustomConfigService) => {
    console.log("Something ...");
    const checkoutClient = new CheckoutClient(customConfigService);
    console.log("Something ...");
    await checkoutClient.registerACHWebhooks();
    console.log("Something ...");
    return checkoutClient;
  },
  inject: [CustomConfigService],
};

@Module({
  imports: [ConfigModule, CommonModule, NotificationsModule],
  controllers: [PaymentWebhooksController],
  providers: [CheckoutClientProvider, PlaidClient, PaymentService, CheckoutWebhooksMapper],
  exports: [CheckoutClient, PlaidClient, PaymentService],
})
export class PspModule {}
