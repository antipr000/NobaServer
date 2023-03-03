import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateEmployerAllocationDTO {
  @ApiProperty()
  employerID: string;

  // Deprecated TODO: https://noba.atlassian.net/browse/CRYPTO-809
  @ApiPropertyOptional()
  employerReferralID?: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
