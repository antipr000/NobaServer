import { Controller, HttpStatus, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationWorkflowService } from "./notification.workflow.service";
import { NotificationWorkflowTypes } from "./domain/NotificationTypes";

@Controller("wf/v1/notification")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
@IsNoApiKeyNeeded()
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
    @Query("transactionID") transactionID: string,
  ): Promise<void> {
    await this.notificationWorkflowService.sendNotification(
      notificationType as NotificationWorkflowTypes,
      transactionID,
    );
  }
}