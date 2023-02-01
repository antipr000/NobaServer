import { ApiProperty } from "@nestjs/swagger";

export class LinkedEmployerDTO {
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
  payrollDates: Date[];

  @ApiProperty()
  nextPayrollDate: Date;
}
