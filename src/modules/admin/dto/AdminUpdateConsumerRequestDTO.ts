import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../../consumer/domain/Address";
import { KYCStatus, DocumentVerificationStatus, KYCProvider } from "@prisma/client";
import { KYC } from "../../../modules/consumer/domain/KYC";
class AddressDTO implements Address {
  @ApiProperty()
  streetLine1: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  regionCode: string;

  @ApiProperty()
  postalCode: string;
}

class VerificationDataDTO implements Partial<KYC> {
  @ApiPropertyOptional({ enum: KYCProvider })
  verificationProvider?: KYCProvider;

  @ApiPropertyOptional({ enum: KYCStatus })
  kycVerificationStatus?: KYCStatus;

  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus: DocumentVerificationStatus;
}

export class AdminUpdateConsumerRequestDTO {
  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  address?: AddressDTO;

  @ApiPropertyOptional()
  verificationData?: VerificationDataDTO;
}
