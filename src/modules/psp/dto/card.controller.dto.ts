import { ApiProperty } from "@nestjs/swagger";
import { NobaCardType } from "../card/domain/NobaCard";

export class CardResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastFourDigits: string;
}

export class CardCreateRequestDTO {
  @ApiProperty({ enum: NobaCardType })
  type: NobaCardType;
}
