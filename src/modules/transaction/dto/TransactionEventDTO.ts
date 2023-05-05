import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum IncludeEventTypes {
  ALL = "All",
  EXTERNAL = "External Only",
  NONE = "None",
}

export class TransactionEventDTO {
  @ApiProperty({ description: "A simple message describing the event, in English" })
  message: string;

  @ApiPropertyOptional({ description: "The date and time the event occurred" })
  timestamp?: Date;

  @ApiPropertyOptional({
    description: "Whether the event should be hidden from user view (true) or exposed to the user (false)",
  })
  internal?: boolean;

  @ApiPropertyOptional({ description: "A more detailed description of the event, in English" })
  details?: string;

  @ApiPropertyOptional({ description: "Internationalized text for display to the user" })
  text?: string;
}

export class AddTransactionEventDTO {
  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  internal?: boolean;

  @ApiPropertyOptional()
  details?: string;

  @ApiPropertyOptional()
  key?: string;

  @ApiPropertyOptional()
  parameters?: string[];
}
