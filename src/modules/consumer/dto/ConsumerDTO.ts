import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../domain/Address";
import { PaymentMethodType } from "../domain/PaymentMethod";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";

export class PaymentMethodCardDataDTO {
  @ApiPropertyOptional()
  cardType?: string;

  @ApiProperty()
  first6Digits: string;

  @ApiProperty()
  last4Digits: string;
}

export class PaymentMethodACHDataDTO {
  @ApiProperty()
  accountMask: string;

  @ApiPropertyOptional()
  accountType?: string;
}

export class PaymentMethodsDTO {
  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: PaymentMethodType })
  type: PaymentMethodType;

  @ApiPropertyOptional()
  imageUri?: string;

  @ApiProperty()
  paymentToken: string;

  @ApiProperty({ enum: PaymentMethodStatus })
  status: PaymentMethodStatus;

  @ApiPropertyOptional()
  cardData?: PaymentMethodCardDataDTO;

  @ApiPropertyOptional()
  achData?: PaymentMethodACHDataDTO;
}

export class CryptoWalletsDTO {
  @ApiPropertyOptional()
  walletName?: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  chainType?: string;

  @ApiPropertyOptional()
  isEVMCompatible?: boolean;

  @ApiProperty({ enum: WalletStatus })
  status: WalletStatus;

  // Keep from API as this should not be exposed to user
  //partnerID: string;
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
  isDisabled?: boolean;

  @ApiPropertyOptional({ type: [PaymentMethodsDTO] })
  paymentMethods?: PaymentMethodsDTO[];

  @ApiPropertyOptional({ type: [CryptoWalletsDTO] })
  cryptoWallets?: CryptoWalletsDTO[];

  @ApiPropertyOptional({ enum: PaymentMethodStatus })
  paymentMethodStatus?: PaymentMethodStatus;

  @ApiPropertyOptional({ enum: WalletStatus })
  walletStatus?: WalletStatus;
}

export class ConsumerSimpleDTO {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;
}
