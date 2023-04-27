import { ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeStatus } from "../domain/Employee";
import { SortOrder } from "../../../core/infra/PaginationTypes";

export class SortOptions {
  @ApiPropertyOptional({ enum: SortOrder })
  createdAt?: SortOrder;

  @ApiPropertyOptional()
  status?: boolean;
}

export class EmployeeFilterOptionsDTO {
  @ApiPropertyOptional()
  employerID?: string;

  @ApiPropertyOptional()
  firstNameContains?: string;

  @ApiPropertyOptional()
  lastNameContains?: string;

  @ApiPropertyOptional()
  employeeEmail?: string;

  @ApiPropertyOptional({
    description: "number of pages to skip, offset 0 means first page results, 1 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "sort by status", enum: EmployeeStatus })
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  sortBy?: SortOptions;
}
