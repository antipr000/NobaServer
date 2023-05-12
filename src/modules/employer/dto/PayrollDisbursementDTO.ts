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

export class PayrollDisbursementDTOWrapper {
  disbursements: PayrollDisbursementDTO[];
}

export class PayrollDisbursementsAllocationAmount {
  @ApiProperty()
  totalAllocationAmount: number;
}
