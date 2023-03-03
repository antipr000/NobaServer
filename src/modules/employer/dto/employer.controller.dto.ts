import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployerDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  employerName: string;

  @ApiProperty()
  employerLogoURI?: string;

  @ApiProperty()
  leadDays: number;

  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  payrollDates: string[];

  @ApiProperty()
  nextPayrollDate: string;

  @ApiPropertyOptional()
  maxAllocationPercent: number;
}
