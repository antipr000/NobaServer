import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AggregatedPaymentMethodState,
  AggregatedWalletState,
  DocumentVerificationErrorReason,
  DocumentVerificationState,
  KycVerificationState,
  UserState,
} from "../domain/ExternalStates";
import { PaymentMethodType } from "@prisma/client";

export class PaymentMethodCardDataDTO {
  @ApiPropertyOptional()
  cardType?: string;

  @ApiPropertyOptional()
  scheme?: string;

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

  @ApiPropertyOptional()
  cardData?: PaymentMethodCardDataDTO;

  @ApiPropertyOptional()
  achData?: PaymentMethodACHDataDTO;

  @ApiProperty()
  isDefault: boolean;
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
}

export class KycVerificationDTO {
  @ApiProperty({ enum: KycVerificationState })
  kycVerificationStatus: KycVerificationState;

  @ApiPropertyOptional()
  updatedTimestamp?: number;
}

export class AddressDTO {
  @ApiProperty()
  streetLine1: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  regionCode: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  postalCode: string;
}

export class DocumentVerificationDTO {
  @ApiPropertyOptional({ enum: DocumentVerificationState })
  documentVerificationStatus?: DocumentVerificationState;

  @ApiPropertyOptional({ enum: DocumentVerificationErrorReason })
  documentVerificationErrorReason?: DocumentVerificationErrorReason;

  @ApiPropertyOptional()
  updatedTimestamp?: number;
}
export class ConsumerDTO {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  handle?: string;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ enum: UserState })
  status: UserState;

  @ApiProperty()
  kycVerificationData: KycVerificationDTO;

  @ApiProperty()
  documentVerificationData: DocumentVerificationDTO;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  address?: AddressDTO;

  @ApiPropertyOptional({ type: [PaymentMethodsDTO] })
  paymentMethods?: PaymentMethodsDTO[];

  @ApiPropertyOptional({ type: [CryptoWalletsDTO] })
  cryptoWallets?: CryptoWalletsDTO[];

  @ApiPropertyOptional({ enum: AggregatedPaymentMethodState })
  paymentMethodStatus?: AggregatedPaymentMethodState;

  @ApiPropertyOptional({ enum: AggregatedWalletState })
  walletStatus?: AggregatedWalletState;
}

export class ConsumerSimpleDTO {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;
}
