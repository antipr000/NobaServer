import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowName } from "../domain/Transaction";

export class InitiateTransactionDTO {
  @ApiPropertyOptional()
  debitConsumerIDOrTag?: string;

  @ApiPropertyOptional()
  creditConsumerIDOrTag?: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiPropertyOptional({ enum: Currency })
  debitCurrency?: Currency;

  @ApiPropertyOptional()
  debitAmount?: number;

  @ApiPropertyOptional({ enum: Currency })
  creditCurrency?: Currency;

  @ApiPropertyOptional()
  creditAmount?: number;

  @ApiPropertyOptional()
  exchangeRate?: number;
}
