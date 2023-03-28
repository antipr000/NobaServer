import { ApiProperty } from "@nestjs/swagger";

export class IdentificationTypeDTO {
  @ApiProperty()
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  maxLength: number;

  @ApiProperty()
  regex: string;
}
