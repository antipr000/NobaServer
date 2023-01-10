import { PaginatedResult } from "../../../../src/core/infra/PaginationTypes";
import { TransactionDTO } from "./TransactionDTO";
import { ApiProperty } from "@nestjs/swagger";

export class TransactionsQueryResultDTO extends PaginatedResult<TransactionDTO> {
  @ApiProperty({ type: [TransactionDTO] })
  items: TransactionDTO[];
}
