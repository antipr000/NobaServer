import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddPaymentMethodDTO {
  @ApiPropertyOptional()
  cardName?: string;

  @ApiPropertyOptional()
  cardType: string;

  @ApiProperty()
  cardNumber: string;

  @ApiProperty()
  expiryMonth: number;

  @ApiProperty()
  expiryYear: number;

  @ApiProperty()
  cvv: string;

  @ApiPropertyOptional()
  imageUri?: string;
}
