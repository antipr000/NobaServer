import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethodType } from "../domain/Types";

export class AddPaymentMethodDTO {
  @ApiProperty({ enum: Object.values(PaymentMethodType) })
  paymentMethodType: string;

  @ApiPropertyOptional()
  cardNumber?: string;

  @ApiPropertyOptional()
  cardExpiryMonth?: number;

  @ApiPropertyOptional()
  cardExpiryYear?: number;

  @ApiPropertyOptional()
  cardCVV?: string;

  @ApiPropertyOptional()
  billingAddress?: string;

  @ApiPropertyOptional()
  cardHolderName?: string;
}
