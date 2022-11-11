import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationEventType,
  NotificationEventHandler,
} from "../../../modules/notifications/domain/NotificationTypes";
import { NotificationConfiguration } from "../domain/NotificationConfiguration";
import { WebhookType } from "../domain/WebhookTypes";

export class NotificationConfigDTO implements NotificationConfiguration {
  @ApiProperty({ enum: NotificationEventType })
  notificationEventType: NotificationEventType;

  @ApiProperty({ enum: NotificationEventHandler })
  notificationEventHandler: NotificationEventHandler[];
}

export class UpdatePartnerRequestDTO {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  takeRate?: number;

  @ApiPropertyOptional()
  notificationConfigs?: NotificationConfigDTO[];
}
