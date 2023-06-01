import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReminderScheduleDTO {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  createdTimestamp?: Date;

  @ApiPropertyOptional()
  updatedTimestamp?: Date;

  @ApiProperty()
  eventID: string;

  @ApiProperty()
  query: string;

  @ApiProperty()
  groupKey: string;
}

export class AllScheduledRemindersDTO {
  @ApiProperty()
  reminders: ReminderScheduleDTO[];
}

export class AllConsumersDTO {
  @ApiProperty()
  consumerIDs: string[];
}

export class CreateReminderScheduleDTO {
  @ApiProperty()
  eventID: string;

  @ApiProperty()
  query: string;

  @ApiProperty()
  groupKey: string;
}

export class CreateReminderHistoryDTO {
  @ApiProperty()
  consumerID: string;

  @ApiProperty()
  lastSentTimestamp: Date;
}

export class SendEventRequestDTO {
  @ApiProperty()
  consumerID: string;
}
