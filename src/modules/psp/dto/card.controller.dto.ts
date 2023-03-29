import { ApiProperty } from "@nestjs/swagger";
import { CardProvider, NobaCardStatus, NobaCardType } from "../card/domain/NobaCard";

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

  @ApiProperty({ enum: CardProvider })
  provider: CardProvider;
}

export class CardCreateRequestDTO {
  @ApiProperty({ enum: NobaCardType })
  type: NobaCardType;
}

export class WebViewTokenResponseDTO {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  providerCardID: string;

  @ApiProperty({ enum: CardProvider })
  provider: CardProvider;
}
