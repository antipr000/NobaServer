import { ApiProperty } from "@nestjs/swagger";

export class EmployerDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  logoURI?: string;

  @ApiProperty()
  leadDays: number;

  @ApiProperty()
  payrollDates: string[];

  @ApiProperty()
  nextPayrollDate: string;
}
