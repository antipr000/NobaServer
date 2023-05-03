import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus } from "../domain/Transaction";

export class TransactionFilterOptionsDTO {
  @ApiPropertyOptional({ description: "Consumer ID whose transactions is needed" })
  consumerID?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: "Page number, offset 1 means first page results, 2 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "filter for a particular credit currency" })
  creditCurrency?: string;

  @ApiPropertyOptional({ description: "filter for a particular debit currency" })
  debitCurrency?: string;

  @ApiPropertyOptional({
    enum: Object.values(TransactionStatus),
    description: "filter for a particular transaction status",
  })
  transactionStatus?: TransactionStatus;
}
