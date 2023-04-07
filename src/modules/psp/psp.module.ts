import { Module, Provider } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PaymentService } from "./payment.service";
import { CheckoutClient } from "./checkout.client";
import { PlaidClient } from "./plaid.client";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PaymentWebhooksController } from "./payment.webhook.controller";
import { CheckoutWebhooksMapper } from "./mapper/checkout.webhooks";
import { TransactionRepoModule } from "../transaction/repo/transaction.repo.module";
import { getWinstonModule } from "../../core/utils/WinstonModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CircleWorkflowController } from "../circle/workflow/circle.workflow.controller";
import { BankFactoryModule } from "./factory/bank.factory.module";
import { CardController } from "./card/card.controller";
import { CardModule } from "./card/card.module";
import { CirclePublicModule } from "../circle/public/circle.public.module";

// This is made to ensure that the "webhooks" are correctly registered
// before the server starts processing the requests.
export const CheckoutClientProvider: Provider = {
  provide: CheckoutClient,
  useFactory: async (customConfigService: CustomConfigService, logger: Logger) => {
    /* const checkoutClient = new CheckoutClient(customConfigService, logger);
    await checkoutClient.registerACHWebhooks();
    return checkoutClient;*/
  },
  inject: [CustomConfigService, WINSTON_MODULE_PROVIDER],
};

@Module({
  imports: [
    getWinstonModule(),
    CommonModule,
    NotificationsModule,
    TransactionRepoModule,
    CirclePublicModule,
    BankFactoryModule,
    CardModule,
  ],
  controllers: [PaymentWebhooksController, CardController],
  providers: [CheckoutClientProvider, PlaidClient, PaymentService, CheckoutWebhooksMapper],
  exports: [CheckoutClient, PlaidClient, PaymentService],
})
export class PspModule {}

@Module({
  imports: [
    getWinstonModule(),
    CommonModule,
    NotificationsModule,
    TransactionRepoModule,
    PspModule,
    CirclePublicModule,
  ],
  controllers: [CircleWorkflowController],
})
export class PspWorkflowModule {}
