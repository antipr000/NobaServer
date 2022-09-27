import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePartnerRequestDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  allowedCryptoCurrencies: string[];

  @ApiPropertyOptional()
  keepWalletsPrivate?: boolean;

  @ApiPropertyOptional()
  makeOtherPartnerWalletsVisible?: boolean;

  @ApiPropertyOptional()
  bypassLoginOtp?: boolean;

  @ApiPropertyOptional()
  bypassWalletOtp?: boolean;

  @ApiProperty()
  takeRate: number;

  @ApiPropertyOptional()
  creditCardFeeDiscountPercent?: number;

  @ApiPropertyOptional()
  nobaFeeDiscountPercent?: number;

  @ApiPropertyOptional()
  processingFeeDiscountPercent?: number;

  @ApiPropertyOptional()
  networkFeeDiscountPercent?: number;

  @ApiPropertyOptional()
  spreadDiscountPercent?: number;
}
