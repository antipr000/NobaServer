import { ApiProperty } from "@nestjs/swagger";

export class UpdateIdentificationDTO {
  @ApiProperty()
  value: string;
}
