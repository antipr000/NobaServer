import { Body, Controller, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationWorkflowService } from "./notification.workflow.service";
import { NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { SendNotificationRequestDTO } from "./dto/SendNotificationRequestDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";

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
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: BlankResponseDTO })
  async sendNotification(
    @Param("notificationType") notificationType: string,
    @Body() requestBody: SendNotificationRequestDTO,
  ): Promise<BlankResponseDTO> {
    await this.notificationWorkflowService.sendNotification(
      notificationType as NotificationWorkflowTypes,
      requestBody.transactionID,
    );
    return {};
  }
}
