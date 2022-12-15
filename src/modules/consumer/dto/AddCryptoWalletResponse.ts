import { ApiProperty } from "@nestjs/swagger";
import { NotificationMethod } from "./AddCryptoWalletDTO";

export class AddCryptoWalletResponseDTO {
  @ApiProperty()
  walletID: string;

  @ApiProperty({ enum: NotificationMethod })
  notificationMethod: NotificationMethod;
}
