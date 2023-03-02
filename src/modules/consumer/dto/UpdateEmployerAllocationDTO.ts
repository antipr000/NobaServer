import { ApiProperty } from "@nestjs/swagger";

export class UpdateEmployerAllocationDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
