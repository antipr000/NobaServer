import { ApiProperty } from "@nestjs/swagger";

export class LinkedEmployerDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  employerName: string;

  @ApiProperty()
  employerLogoURI: string;

  @ApiProperty()
  allocationAmountInPesos: number;

  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  leadDays: number;

  @ApiProperty()
  payrollDates?: string[];

  @ApiProperty()
  nextPayrollDate?: string;
}
