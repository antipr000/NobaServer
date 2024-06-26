import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployerDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  employerName: string;

  @ApiProperty()
  employerLogoURI?: string;

  @ApiProperty()
  locale?: string;

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

  @ApiPropertyOptional()
  documentNumber: string;

  @ApiPropertyOptional()
  depositMatchingName: string;
}

export class PayrollData {
  @ApiProperty()
  payrollDate: string;

  @ApiProperty()
  primaryContactEmail: string;

  @ApiProperty()
  secondaryContactEmail: string[];

  @ApiProperty()
  primaryContactLanguage: string;

  @ApiProperty()
  payrollAccountNumber: string;
}

export class InviteEmployeeRequestDTO {
  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  salary: number;
}
