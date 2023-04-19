import { Body, Controller, Delete, ForbiddenException, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationWorkflowService } from "./notification.workflow.service";
import { NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { SendNotificationRequestDTO } from "./dto/SendNotificationRequestDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { LatestNotificationResponse } from "./dto/latestnotification.response.dto";
import { isE2ETestEnvironment } from "../../config/ConfigurationUtils";

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
    if (notificationType !== NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT) {
      await this.notificationWorkflowService.sendTransactionNotification(
        notificationType as NotificationWorkflowTypes,
        requestBody.transactionID,
      );
    } else {
      await this.notificationWorkflowService.sendPayrollStatusUpdateNotification(
        requestBody.payrollID,
        requestBody.payrollStatus,
      );
    }
    return {};
  }

  // BEGIN-NOSCAN
  @Get("/test")
  @ApiOperation({ summary: "Get previous notifications in test environment" })
  @ApiResponse({ status: HttpStatus.OK, type: LatestNotificationResponse })
  async getPreviousNotifications(): Promise<LatestNotificationResponse> {
    if (!isE2ETestEnvironment()) {
      throw new ForbiddenException("This endpoint is only available in test environment");
    }

    return this.notificationWorkflowService.getPreviousNotifications();
  }

  @Delete("/test")
  @ApiOperation({ summary: "Clear previous notifications in test environment" })
  @ApiResponse({ status: HttpStatus.OK, type: BlankResponseDTO })
  async clearPreviousNotifications(): Promise<BlankResponseDTO> {
    if (!isE2ETestEnvironment()) {
      throw new ForbiddenException("This endpoint is only available in test environment");
    }

    await this.notificationWorkflowService.clearPreviousNotifications();
    return {};
  }
  // END-NOSCAN
}
