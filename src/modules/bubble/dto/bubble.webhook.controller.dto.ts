import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { Bool } from "../../../core/domain/ApiEnums";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { EmployeeDTO } from "../../../modules/employee/dto/employee.dto";
import { EmployeeStatus } from "../../../modules/employee/domain/Employee";
import { TransactionStatus } from "src/modules/transaction/domain/Transaction";

export class RegisterEmployerRequestDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  logoURI: string;

  @ApiPropertyOptional()
  locale?: string;

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
  locale?: string;

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
  @ApiPropertyOptional()
  salary?: number;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  status?: EmployeeStatus;
}

export class CreatePayrollRequestDTO {
  @ApiProperty()
  payrollDate: string;
}

export class CreatePayrollResponseDTO {
  @ApiProperty()
  payrollID: string;
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

export class EnrichedDisbursementDTO {
  // id->Disbursement.id
  id: string;

  // debitAmount->Disbursement.allocationAmount
  debitAmount: number;

  // creditAmount->Disbursement.creditAmount
  creditAmount: number;

  // status->Transaction.status
  status: TransactionStatus;

  // firstName->Employee.Consumer.firstName
  firstName: string;

  // lastName->Employee.Consumer.lastName
  lastName: string;

  // lastUpdated->Transaction.updatedTimestamp
  lastUpdated: Date;
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

export class EmployeeCreateRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  sendEmail: boolean;
}

export class EmployeeResponseDTO extends EmployeeDTO {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional()
  consumerEmail?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;
}

export class PaginatedEmployeeResponseDTO extends PaginatedResult<EmployeeResponseDTO> {
  @ApiProperty({ type: [EmployeeResponseDTO] })
  items: EmployeeResponseDTO[];
}

export class PaginatedEnrichedDisbursementResponseDTO extends PaginatedResult<EnrichedDisbursementDTO> {
  @ApiProperty({ type: [EnrichedDisbursementDTO] })
  items: EnrichedDisbursementDTO[];
}
