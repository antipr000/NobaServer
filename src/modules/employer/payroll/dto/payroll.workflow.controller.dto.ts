import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../domain/Payroll";

export class UpdatePayrollRequestDTO {
  @ApiPropertyOptional({ enum: PayrollStatus })
  status?: PayrollStatus;
}

export class CreateDisbursementRequestDTO {
  @ApiProperty()
  employeeID: string;
}

export class UpdateDisbursementRequestDTO {
  @ApiPropertyOptional()
  transactionID?: string;
}
