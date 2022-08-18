import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddCryptoWalletDTO {
  @ApiPropertyOptional()
  walletName?: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  chainType?: string;

  @ApiPropertyOptional()
  isEVMCompatible: boolean;
}

export class ConfirmWalletUpdateDTO {
  @ApiProperty()
  address: string;

  @ApiProperty()
  otp: number;
}
