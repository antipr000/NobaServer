import { ApiProperty } from "@nestjs/swagger";

export class UpdateEmployerAllocationDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
