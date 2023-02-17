import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterEmployerRequestDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  logoURI: string;

  @ApiProperty()
  referralID: string;

  @ApiProperty()
  bubbleID: string;

  @ApiProperty()
  maxAllocationPercent: number;

  @ApiPropertyOptional()
  leadDays?: number;

  @ApiPropertyOptional()
  payrollDates?: string[];
}

export class UpdateEmployerRequestDTO {
  @ApiPropertyOptional()
  logoURI?: string;

  @ApiPropertyOptional()
  leadDays?: number;

  @ApiPropertyOptional()
  payrollDates?: string[];

  @ApiPropertyOptional()
  maxAllocationPercent?: number;
}
