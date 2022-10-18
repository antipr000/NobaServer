import { ApiProperty } from "@nestjs/swagger";

export class PlaidTokenDTO {
  @ApiProperty()
  token: string;
}
