import { ApiProperty } from "@nestjs/swagger";

export class EmployerDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  logoURI?: string;

  @ApiProperty()
  leadDays: number;

  @ApiProperty()
  payrollDays: number[];
}
