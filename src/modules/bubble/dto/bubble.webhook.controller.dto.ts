import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

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
  @ApiProperty()
  shouldIncludeDisbursements: boolean;
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
