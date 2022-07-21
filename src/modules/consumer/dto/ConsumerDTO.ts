import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../domain/Address";
import { KYCStatus, DocumentVerificationStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";

export class PaymentMethodsDTO {
  @ApiPropertyOptional()
  cardName?: string;

  @ApiPropertyOptional()
  cardType?: string;

  @ApiPropertyOptional()
  imageUri?: string;

  @ApiProperty()
  paymentToken: string;

  @ApiProperty()
  first6Digits: string;

  @ApiProperty()
  last4Digits: string;

  @ApiProperty({ enum: PaymentMethodStatus })
  status: PaymentMethodStatus;
}

export class CryptoWalletsDTO {
  @ApiProperty()
  walletName: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  chainType: string;

  @ApiProperty()
  isEVMCompatible: boolean;

  @ApiProperty({ enum: WalletStatus })
  status: WalletStatus;
}

export class KycVerificationDTO {
  @ApiProperty({ enum: KYCStatus })
  kycVerificationStatus: KYCStatus;

  @ApiPropertyOptional()
  updatedTimestamp?: number;
}

export class DocumentVerificationDTO {
  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus?: string;

  @ApiPropertyOptional()
  updatedTimestamp?: number;
}
export class ConsumerDTO {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  kycVerificationData: KycVerificationDTO;

  @ApiProperty()
  documentVerificationData: DocumentVerificationDTO;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  address?: Address;

  @ApiProperty()
  isSuspectedFraud: boolean;

  @ApiProperty()
  isLocked: boolean;

  @ApiPropertyOptional()
  isDeleted?: boolean;

  @ApiPropertyOptional({ type: [PaymentMethodsDTO] })
  paymentMethods?: PaymentMethodsDTO[];

  @ApiPropertyOptional({ type: [CryptoWalletsDTO] })
  cryptoWallets?: CryptoWalletsDTO[];

  @ApiPropertyOptional({ enum: PaymentMethodStatus })
  paymentMethodStatus?: PaymentMethodStatus;

  @ApiPropertyOptional({ enum: WalletStatus })
  walletStatus?: WalletStatus;
}
