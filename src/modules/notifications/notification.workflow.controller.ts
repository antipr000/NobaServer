import { Body, Controller, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationWorkflowService } from "./notification.workflow.service";
import { NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { SendNotificationRequestDTO } from "./dto/SendNotificationRequestDTO";

@Controller("wf/v1/notification")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class NotificationWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly notificationWorkflowService: NotificationWorkflowService;

  @Post("/:notificationType")
  @ApiOperation({ summary: "Send notification from workflow" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  async sendNotification(
    @Param("notificationType") notificationType: string,
    @Body() requestBody: SendNotificationRequestDTO,
  ): Promise<void> {
    await this.notificationWorkflowService.sendNotification(
      notificationType as NotificationWorkflowTypes,
      requestBody.transactionID,
    );
  }
}
