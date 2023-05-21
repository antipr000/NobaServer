import { ApiProperty } from "@nestjs/swagger";

export class ReminderScheduleDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;

  @ApiProperty()
  eventID: string;

  @ApiProperty()
  query: string;

  @ApiProperty()
  groupKey: string;
}

export class CreateReminderScheduleDTO {
  @ApiProperty()
  eventID: string;

  @ApiProperty()
  query: string;

  @ApiProperty()
  groupKey: string;
}
