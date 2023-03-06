import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../../consumer/domain/Address";
import { KYCStatus, DocumentVerificationStatus, KYCProvider } from "@prisma/client";
import { KYC } from "../../../modules/consumer/domain/KYC";
class AddressDTO implements Partial<Address> {
  @ApiPropertyOptional()
  streetLine1?: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiPropertyOptional()
  countryCode?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  regionCode?: string;

  @ApiPropertyOptional()
  postalCode?: string;
}

class VerificationDataDTO implements Partial<KYC> {
  @ApiPropertyOptional({ enum: KYCProvider })
  provider?: KYCProvider;

  @ApiPropertyOptional({ enum: KYCStatus })
  kycCheckStatus?: KYCStatus;

  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus?: DocumentVerificationStatus;
}

export class AdminUpdateConsumerRequestDTO {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  address?: AddressDTO;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional()
  isLocked?: boolean;

  @ApiPropertyOptional()
  isDisabled?: boolean;

  @ApiPropertyOptional()
  referredByID?: string;

  @ApiPropertyOptional()
  verificationData?: VerificationDataDTO;
}
