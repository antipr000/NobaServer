import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum NotificationMethod {
  EMAIL = "Email",
  PHONE = "Phone",
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

  @ApiPropertyOptional({ enum: NotificationMethod })
  notificationMethod?: NotificationMethod = NotificationMethod.EMAIL;
}

export class ConfirmWalletUpdateDTO {
  @ApiProperty()
  walletID: string;

  @ApiProperty()
  otp: number;

  @ApiPropertyOptional({ enum: NotificationMethod })
  notificationMethod?: NotificationMethod = NotificationMethod.EMAIL;
}
