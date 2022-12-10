import { ApiPropertyOptional } from "@nestjs/swagger";

export class TransactionFilterDTO {
  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD. Example: '2010-04-27' means 27th Apr 2010 at 00:00:00 UTC",
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD. This is inclusive. Example: '2010-04-27' means 27th Apr 2010 at 23:59:59 UTC",
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: "Whether to include 'only' COMPLETED Transactions. Default value is 'false'",
  })
  onlyCompletedTransactions?: boolean;
}
