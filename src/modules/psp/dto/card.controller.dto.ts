import { ApiProperty } from "@nestjs/swagger";

export class CardResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastFourDigits: string;
}
