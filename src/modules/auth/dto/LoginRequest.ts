import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class LoginRequestDTO {
  @ApiPropertyOptional()
  emailOrPhone?: string;

  @ApiPropertyOptional({
    description: "This attribute is deprecated and will be removed in future, please use emailOrPhone instead",
  })
  email?: string;

  @ApiProperty({ enum: allIdentities })
  identityType: string;
}
