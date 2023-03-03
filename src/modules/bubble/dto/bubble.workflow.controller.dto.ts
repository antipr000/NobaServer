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

  @ApiPropertyOptional()
  maxAllocationPercent?: number;

  @ApiPropertyOptional()
  leadDays?: number;

  @ApiPropertyOptional()
  payrollAccountNumber?: string;

  @ApiPropertyOptional()
  payrollDates?: string[];
}

export class UpdateEmployerRequestDTO {
  @ApiPropertyOptional()
  logoURI?: string;

  @ApiPropertyOptional()
  leadDays?: number;

  @ApiPropertyOptional()
  payrollAccountNumber?: string;

  @ApiPropertyOptional()
  payrollDates?: string[];

  @ApiPropertyOptional()
  maxAllocationPercent?: number;
}

export class UpdateEmployeeRequestDTO {
  @ApiProperty()
  salary: number;
}
