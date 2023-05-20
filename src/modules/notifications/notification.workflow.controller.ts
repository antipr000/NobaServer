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
import { ReminderScheduleDTO } from "./dto/notification.workflow.controller.dto";

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
    await this.notificationWorkflowService.sendNotification(notificationType as NotificationWorkflowTypes, requestBody);
    return {};
  }

  @Get("/reminder/:groupKey")
  @ApiOperation({ summary: "Get all reminders for a groupKey" })
  @ApiResponse({ status: HttpStatus.OK, type: Array<ReminderScheduleDTO> })
  async getReminderSchedules(@Param("groupKey") groupKey: string): Promise<ReminderScheduleDTO[]> {
    const reminderSchedules = await this.notificationWorkflowService.getAllReminderSchedulesForGroup(groupKey);
    return reminderSchedules.map(reminderSchedule => {
      return {
        id: reminderSchedule.id,
        createdTimestamp: reminderSchedule.createdTimestamp,
        updatedTimestamp: reminderSchedule.updatedTimestamp,
        eventID: reminderSchedule.eventID,
        query: reminderSchedule.query,
        groupKey: reminderSchedule.groupKey,
      };
    });
  }

  @Get("/reminder/:reminderID/consumers")
  @ApiOperation({ summary: "Get all consumer ids for a reminder" })
  @ApiResponse({ status: HttpStatus.OK, type: Array<string> })
  async getReminderConsumers(@Param("reminderID") reminderID: string): Promise<string[]> {
    return this.notificationWorkflowService.getAllConsumerIDsForReminder(reminderID);
  }

  @Post("/event/:eventID")
  @ApiOperation({ summary: "Send event based on event id" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: BlankResponseDTO })
  async sendEvent(@Param("eventID") eventID: string): Promise<BlankResponseDTO> {
    await this.notificationWorkflowService.sendEvent(eventID);
    return {};
  }

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
}
