import { ApiProperty } from "@nestjs/swagger";

export class UpdateEmployerAllocationDTO {
  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
