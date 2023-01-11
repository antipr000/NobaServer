import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";

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

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;

  @ApiPropertyOptional()
  memo?: string;
}
