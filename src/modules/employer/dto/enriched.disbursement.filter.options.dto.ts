import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SortOrder } from "../../../core/infra/PaginationTypes";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";

export class EnrichedDisbursementFilterOptionsDTO {
  @ApiPropertyOptional({
    description: "Page number, offset 1 means first page results, 2 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "filter by status", enum: TransactionStatus })
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: SortOrder })
  sortLastName?: SortOrder;

  @ApiPropertyOptional({ enum: SortOrder })
  sortAllocationAmount?: SortOrder;

  @ApiPropertyOptional({ enum: SortOrder })
  sortCreditAmount?: SortOrder;

  @ApiPropertyOptional({ enum: SortOrder })
  sortStatus?: SortOrder;
}
