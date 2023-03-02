import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeAllocationCurrency } from "../domain/Employee";

export class EmployeeDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  allocationAmount: number;

  @ApiProperty()
  allocationCurrency: EmployeeAllocationCurrency;

  @ApiProperty()
  employerID: string;

  @ApiProperty()
  consumerID: string;

  @ApiPropertyOptional()
  salary?: number;
}
