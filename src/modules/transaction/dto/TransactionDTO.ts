import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowName } from "../domain/Transaction";

export class TransactionDTO {
  @ApiProperty()
  transactionRef: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiProperty()
  debitCurrency: string;

  @ApiProperty()
  creditCurrency: string;

  @ApiProperty()
  debitAmount: number;

  @ApiProperty()
  creditAmount: number;

  @ApiProperty()
  exchangeRate: string;

  @ApiPropertyOptional()
  memo?: string;
}
