import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePaymentMethodDTO {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  isDefault?: boolean;
}
