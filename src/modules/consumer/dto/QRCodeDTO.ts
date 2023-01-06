import { ApiProperty } from "@nestjs/swagger";

export class QRCodeDTO {
  @ApiProperty()
  base64OfImage: string;
}
