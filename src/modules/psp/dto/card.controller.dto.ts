import { ApiProperty } from "@nestjs/swagger";
import { NobaCardStatus, NobaCardType } from "../card/domain/NobaCard";

export class CardResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastFourDigits: string;

  @ApiProperty({ enum: NobaCardStatus })
  status: NobaCardStatus;

  @ApiProperty({ enum: NobaCardType })
  type: NobaCardType;

  @ApiProperty()
  consumerID: string;
}

export class CardCreateRequestDTO {
  @ApiProperty({ enum: NobaCardType })
  type: NobaCardType;
}
