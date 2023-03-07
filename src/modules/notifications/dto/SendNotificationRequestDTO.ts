import { ApiPropertyOptional } from "@nestjs/swagger";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

export class SendNotificationRequestDTO {
  @ApiPropertyOptional()
  transactionID?: string;

  @ApiPropertyOptional()
  payrollID?: string;

  @ApiPropertyOptional({ enum: PayrollStatus })
  payrollStatus?: PayrollStatus;
}
