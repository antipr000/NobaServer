import { ApiProperty } from "@nestjs/swagger";

export class LoginRequestDTO {
  @ApiProperty()
  email: string;
}
