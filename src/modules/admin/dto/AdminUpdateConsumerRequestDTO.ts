import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VerificationData, VerificationProviders } from "../../consumer/domain/VerificationData";
import { Address } from "../../consumer/domain/Address";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../../consumer/domain/VerificationStatus";
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

class VerificationDataDTO implements Partial<VerificationData> {
  @ApiPropertyOptional()
  verificationProvider?: VerificationProviders;

  @ApiPropertyOptional({ enum: ConsumerVerificationStatus })
  kycVerificationStatus?: ConsumerVerificationStatus;

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
