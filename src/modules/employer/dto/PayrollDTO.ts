import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../domain/Payroll";

export class PayrollDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employerID: string;

  @ApiProperty()
  reference: number;

  @ApiProperty()
  payrollDate: string;

  @ApiPropertyOptional()
  completedTimestamp?: Date;

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

  @ApiProperty({ enum: PayrollStatus })
  status: PayrollStatus;
}
