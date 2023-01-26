import { ApiProperty } from "@nestjs/swagger";
import { ExchangeRateFlags } from "../domain/ExchangeRateFlags";
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

  @ApiProperty({ enum: ExchangeRateFlags })
  exchangeRateFlags: ExchangeRateFlags[];
}
