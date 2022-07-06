import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../domain/Address";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../domain/VerificationStatus";

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
  first6Digits: number;

  @ApiProperty()
  last4Digits: number;
}

export class CryptoWalletsDTO {
  @ApiProperty()
  address: string;

  @ApiProperty()
  chainType: string;

  @ApiProperty()
  isEVMCompatible: boolean;

  @ApiProperty()
  status: string;
}

export class KycVerificationDTO {
  @ApiPropertyOptional({ enum: ConsumerVerificationStatus })
  kycVerificationStatus?: string;

  @ApiPropertyOptional()
  updatedAt?: number;
}

export class DocumentVerificationDTO {
  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus?: string;

  @ApiPropertyOptional()
  updatedAt?: number;
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

  @ApiPropertyOptional({ type: [PaymentMethodsDTO] })
  paymentMethods?: PaymentMethodsDTO[];

  @ApiPropertyOptional({ type: [CryptoWalletsDTO] })
  cryptoWallets?: CryptoWalletsDTO[];
}
