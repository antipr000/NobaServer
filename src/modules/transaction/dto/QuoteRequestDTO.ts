import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionFlags } from "../domain/TransactionFlags";
import { WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";

export class QuoteRequestDTO {
  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ enum: Currency })
  desiredCurrency: Currency;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiPropertyOptional({ enum: TransactionFlags, isArray: true })
  options?: TransactionFlags[];
}
