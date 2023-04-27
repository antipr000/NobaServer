import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeDTO } from "../../../modules/employee/dto/EmployeeDTO";

export class EmployerWorkflowDTO {
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

  @ApiPropertyOptional()
  documentNumber: string;
}

export class EmployeesWorkflowDTO {
  @ApiProperty()
  employees: EmployeeDTO[];
}
