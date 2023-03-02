import { ApiProperty } from "@nestjs/swagger";

export class RegisterWithEmployerDTO {
  @ApiProperty()
  employerID: string;

  // Deprecated TODO: https://noba.atlassian.net/browse/CRYPTO-809
  @ApiProperty()
  employerReferralID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
