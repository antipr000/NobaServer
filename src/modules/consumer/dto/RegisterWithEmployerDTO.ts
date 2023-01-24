import { ApiProperty } from "@nestjs/swagger";

export class RegisterWithEmployerDTO {
  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
