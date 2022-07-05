import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class LoginRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty({ enum: allIdentities })
  identityType: string;

  @ApiPropertyOptional()
  partnerID?: string;
}
