import { ApiPropertyOptional } from "@nestjs/swagger";

export class EmployeeFilterOptionsDTO {
  @ApiPropertyOptional()
  employerID?: string;

  @ApiPropertyOptional()
  firstNameStartsWith?: string;

  @ApiPropertyOptional()
  lastNameStartsWith?: string;

  @ApiPropertyOptional()
  employeeEmail?: string;

  @ApiPropertyOptional({
    description: "number of pages to skip, offset 0 means first page results, 1 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;
}
