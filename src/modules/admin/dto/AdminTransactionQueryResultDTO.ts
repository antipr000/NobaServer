import { PaginatedResult } from "../../../../src/core/infra/PaginationTypes";
import { ApiProperty } from "@nestjs/swagger";
import { TransactionDTO } from "../../../modules/transaction/dto/TransactionDTO";

export class AdminTransactionQueryResultDTO extends PaginatedResult<TransactionDTO> {
  @ApiProperty({ type: [TransactionDTO] })
  items: TransactionDTO[];
}
