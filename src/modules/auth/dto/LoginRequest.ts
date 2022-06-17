import { ApiProperty } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class LoginRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty({ enum: allIdentities })
  identityType: string;
}
