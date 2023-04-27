import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { Bool } from "../../../core/domain/ApiEnums";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { EmployeeDTO } from "../../../modules/employee/dto/employee.dto";

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

export class CreatePayrollRequestDTO {
  @ApiProperty()
  payrollDate: string;
}

export class CreatePayrollResponseDTO {
  @ApiProperty()
  payrollID: string;
}

export class PayrollQueryDTO {
  @ApiProperty({ enum: Bool })
  shouldIncludeDisbursements: Bool;
}

export class DisbursementDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeID: string;

  @ApiPropertyOptional()
  transactionID?: string;

  @ApiProperty()
  debitAmount: number;
}

export class PayrollDTO {
  @ApiProperty()
  payrollID: string;

  @ApiProperty()
  payrollDate: string;

  @ApiProperty()
  reference: string;

  @ApiPropertyOptional()
  completedTimestamp?: Date;

  @ApiProperty({ enum: PayrollStatus })
  status: PayrollStatus;

  @ApiProperty()
  payrollISODate: Date;

  @ApiPropertyOptional()
  totalDebitAmount?: number;

  @ApiPropertyOptional()
  totalCreditAmount?: number;

  @ApiPropertyOptional()
  exchangeRate?: number;

  @ApiPropertyOptional()
  debitCurrency?: string;

  @ApiPropertyOptional()
  creditCurrency?: string;

  @ApiPropertyOptional()
  disbursements?: DisbursementDTO[];
}

export class EmployeeResponseDTO extends EmployeeDTO {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  handle: string;

  @ApiPropertyOptional()
  consumerEmail?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;
}

export class PaginatedEmployeeResponseDTO extends PaginatedResult<EmployeeResponseDTO> {
  @ApiProperty({ type: [EmployeeResponseDTO] })
  items: EmployeeResponseDTO[];
}
