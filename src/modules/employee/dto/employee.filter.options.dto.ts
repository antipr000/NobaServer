import { ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeStatus } from "../domain/Employee";
import { SortOrder } from "../../../core/infra/PaginationTypes";

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
    description: "Page number, offset 1 means first page results, 2 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "filter by status", enum: EmployeeStatus })
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: SortOrder })
  createdTimestamp?: SortOrder;

  @ApiPropertyOptional({ enum: SortOrder })
  sortStatus?: SortOrder;
}
