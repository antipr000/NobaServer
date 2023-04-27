import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeDTO } from "../../employee/dto/employee.dto";

export class EmployerWorkflowDTO {
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
}

export class EmployeesWorkflowDTO {
  @ApiProperty()
  employees: EmployeeDTO[];
}
