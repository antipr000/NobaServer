import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ActionDTO {
  @ApiProperty()
  source: string;

  @ApiPropertyOptional()
  user_email?: string;

  @ApiPropertyOptional()
  value?: string;
}

export class CaseDTO {
  @ApiProperty()
  sessionKey: string;

  @ApiProperty()
  customerID: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  checkpoint?: string;

  @ApiPropertyOptional()
  transactionID?: string;
}
