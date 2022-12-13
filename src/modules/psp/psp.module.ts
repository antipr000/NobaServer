import { Module, Provider } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PaymentService } from "./payment.service";
import { CheckoutClient } from "./checkout.client";
import { PlaidClient } from "./plaid.client";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PaymentWebhooksController } from "./payment.webhook.controller";
import { CheckoutWebhooksMapper } from "./mapper/checkout.webhooks";
import { TransactionRepoModule } from "../transactions/repo/transaction.repo.module";
import { getWinstonModule } from "../../core/utils/WinstonModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CircleClient } from "./circle.client";
import { CircleController } from "./circle.controller";

// This is made to ensure that the "webhooks" are correctly registered
// before the server starts processing the requests.
export const CheckoutClientProvider: Provider = {
  provide: CheckoutClient,
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    const checkoutClient = new CheckoutClient(customConfigService, logger);
    await checkoutClient.registerACHWebhooks();
    return checkoutClient;
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

@Module({
  imports: [getWinstonModule(), CommonModule, NotificationsModule, TransactionRepoModule],
  controllers: [PaymentWebhooksController, CircleController],
  providers: [CheckoutClientProvider, PlaidClient, PaymentService, CheckoutWebhooksMapper, CircleClient],
  exports: [CheckoutClient, PlaidClient, PaymentService, CircleClient],
})
export class PspModule {}
