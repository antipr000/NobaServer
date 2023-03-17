import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";

export class AdminTransactionFilterOptionsDTO {
  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: "number of pages to skip, offset 0 means first page results, 1 means second page etc.",
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
