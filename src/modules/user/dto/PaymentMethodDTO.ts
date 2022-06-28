import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethodType } from "../domain/Types";

export class PaymentMethodDTO {
  @ApiProperty()
  paymentMethodID: string;

  @ApiProperty({ enum: Object.values(PaymentMethodType) })
  paymentMethodType: string;

  //send masked number only to client
  @ApiPropertyOptional()
  cardNumber?: string;

  @ApiPropertyOptional()
  billingAddress?: string;

  @ApiPropertyOptional()
  cardHolderName?: string;
}
