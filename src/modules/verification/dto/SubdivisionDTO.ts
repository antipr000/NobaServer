import { ApiProperty } from "@nestjs/swagger";
import { Subdivision } from "src/externalclients/idvproviders/definitions";

export class SubdivisionDTO implements Subdivision {
  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;
}
