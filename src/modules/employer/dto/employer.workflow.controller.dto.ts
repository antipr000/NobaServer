import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeDTO } from "src/modules/employee/dto/EmployeeDTO";

export class EmployerWorkflowDTO {
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

  @ApiPropertyOptional()
  employees?: EmployeeDTO[];
}
