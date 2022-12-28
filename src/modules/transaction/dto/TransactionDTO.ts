import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";

export class TransactionDTO {
  @ApiProperty()
  transactionRef: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiProperty()
  debitConsumer: string;

  @ApiProperty()
  creditConsumer: string;

  @ApiProperty({ enum: Currency })
  debitCurrency: Currency;

  @ApiProperty({ enum: Currency })
  creditCurrency: Currency;

  @ApiProperty()
  debitAmount: number;

  @ApiProperty()
  creditAmount: number;

  @ApiProperty()
  exchangeRate: string;

  @ApiPropertyOptional()
  memo?: string;
}
