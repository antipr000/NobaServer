import { ApiPropertyOptional } from "@nestjs/swagger";
import { SortOrder } from "../../../core/infra/PaginationTypes";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";

export enum EnrichedDisbursementSortOptions {
  LAST_NAME = "lastName",
  ALLOCATION_AMOUNT = "allocationAmount",
  CREDIT_AMOUNT = "creditAmount",
  STATUS = "status",
}

export class EnrichedDisbursementFilterOptionsDTO {
  @ApiPropertyOptional({
    description: "Page number, offset 1 means first page results, 2 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "filter by status", enum: TransactionStatus })
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: SortOrder, description: "sort direction" })
  sortDirection?: SortOrder;

  @ApiPropertyOptional({ enum: EnrichedDisbursementSortOptions, description: "sort options" })
  sortBy?: EnrichedDisbursementSortOptions;
}
