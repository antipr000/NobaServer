import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PayrollDisbursementDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeID: string;

  @ApiProperty()
  payrollID: string;

  @ApiPropertyOptional()
  transactionID?: string;

  @ApiProperty()
  allocationAmount: number;
}
