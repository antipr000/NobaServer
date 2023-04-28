import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmployeeAllocationCurrency, EmployeeStatus } from "../domain/Employee";

export class EmployeeDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  allocationAmount: number;

  @ApiProperty()
  allocationCurrency: EmployeeAllocationCurrency;

  @ApiProperty()
  employerID: string;

  @ApiPropertyOptional()
  consumerID: string;

  @ApiPropertyOptional()
  salary?: number;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  status: EmployeeStatus;
}
