import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CardDetailsDTO {
  @ApiProperty()
  cardNumber: string;

  @ApiProperty()
  expiryMonth: number;

  @ApiProperty()
  expiryYear: number;

  @ApiProperty()
  cvv: string;
}

export class ACHDetailsDTO {
  @ApiProperty()
  token: string;
}

export enum PaymentType {
  CARD = "CARD", // Keep this consistent with PaymentMethodType.Card! Not a technical requirement but makes sense API-wise.
  ACH = "ACH",
}

export class AddPaymentMethodDTO {
  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: PaymentType })
  type: PaymentType;

  @ApiPropertyOptional({ type: CardDetailsDTO })
  cardDetails?: CardDetailsDTO;

  @ApiPropertyOptional({ type: ACHDetailsDTO })
  achDetails?: ACHDetailsDTO;

  @ApiPropertyOptional()
  imageUri?: string;

  @ApiPropertyOptional()
  isDefault?: boolean;
}
