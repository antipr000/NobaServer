import { ApiProperty } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class LoginRequestDTO {
  @ApiProperty()
  emailOrPhone?: string;

  @ApiProperty({
    description: "This attribute is deprecated and will be removed in future, please use emailOrPhone instead",
  })
  email?: string;

  @ApiProperty({ enum: allIdentities })
  identityType: string;
}
