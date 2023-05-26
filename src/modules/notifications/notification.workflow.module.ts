import { Module } from "@nestjs/common";
import { ConsumerModule } from "../consumer/consumer.module";
import { TransactionModule } from "../transaction/transaction.module";
import { NotificationWorkflowController } from "./notification.workflow.controller";
import { NotificationWorkflowService } from "./notification.workflow.service";
import { ConfigModule } from "@nestjs/config";
import { NotificationsModule } from "./notification.module";
import { EmployerModule } from "../employer/employer.module";
import { NotificationRepoModule } from "./repos/notification.repo.module";

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    ConsumerModule,
    TransactionModule,
    EmployerModule,
    NotificationRepoModule,
  ],
  controllers: [NotificationWorkflowController],
  providers: [NotificationWorkflowService],
})
export class NotificationWorkflowModule {}
