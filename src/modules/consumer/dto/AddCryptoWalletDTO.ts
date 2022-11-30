import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum NotificationMethod {
  EMAIL = "email",
  PHONE = "phone",
}

export class AddCryptoWalletDTO {
  @ApiPropertyOptional()
  walletName?: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  chainType?: string;

  @ApiPropertyOptional()
  isEVMCompatible: boolean;

  @ApiProperty({ enum: NotificationMethod })
  notificationMethod: NotificationMethod;
}

export class ConfirmWalletUpdateDTO {
  @ApiProperty()
  address: string;

  @ApiProperty()
  otp: number;
}
