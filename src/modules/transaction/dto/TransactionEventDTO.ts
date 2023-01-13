import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum IncludeEventTypes {
  ALL = "All",
  EXTERNAL = "External Only",
  NONE = "None",
}

export class TransactionEventDTO {
  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  timestamp?: Date;

  @ApiPropertyOptional()
  internal?: boolean;

  @ApiPropertyOptional()
  details?: string;

  @ApiPropertyOptional()
  key?: string;

  @ApiPropertyOptional()
  parameters?: string[];
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
