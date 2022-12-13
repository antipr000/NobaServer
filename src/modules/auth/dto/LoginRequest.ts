import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class LoginRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;

  @ApiProperty({ enum: allIdentities, description: "Identity type of the user logging in" })
  identityType: string;

  @ApiPropertyOptional({ description: "Whether or not to auto-create an account if not present" })
  autoCreate?: boolean;
}
