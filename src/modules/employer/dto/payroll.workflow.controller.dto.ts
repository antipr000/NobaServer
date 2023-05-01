import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../domain/Payroll";

// TODO: Add a separate dto for service layer.
export class UpdatePayrollRequestDTO {
  @ApiPropertyOptional({ enum: PayrollStatus })
  status?: PayrollStatus;

  @ApiPropertyOptional()
  paymentMonoTransactionID: string;
}

export class CreateDisbursementRequestDTO {
  @ApiProperty()
  employeeID: string;
}

export class UpdateDisbursementRequestDTO {
  @ApiPropertyOptional()
  transactionID?: string;

  @ApiPropertyOptional()
  creditAmount?: number;
}
