import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddPaymentMethodDTO {
  @ApiPropertyOptional()
  cardName?: string;

  @ApiProperty()
  cardType: string;

  @ApiProperty()
  first6Digits: number;

  @ApiProperty()
  last4Digits: number;

  @ApiProperty()
  expiryMonth: number;

  @ApiProperty()
  expiryYear: number;

  @ApiProperty()
  cvv: string;

  @ApiPropertyOptional()
  imageUri?: string;
}
