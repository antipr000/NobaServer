import { ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentVerificationStatus, KYCProvider, KYCStatus } from "@prisma/client";

export class ConsumerInternalAddressDTO {
  @ApiPropertyOptional()
  streetLine1?: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  countryCode?: string;

  @ApiPropertyOptional()
  regionCode?: string;

  @ApiPropertyOptional()
  postalCode?: string;
}

export class ConsumerInternalKYCDTO {
  @ApiPropertyOptional({ enum: KYCProvider })
  provider?: KYCProvider;

  @ApiPropertyOptional()
  kycCheckReference?: string;

  @ApiPropertyOptional()
  documentCheckReference?: string;

  @ApiPropertyOptional()
  riskRating?: string;

  @ApiPropertyOptional()
  isSuspectedFraud?: boolean;

  @ApiPropertyOptional({ enum: KYCStatus })
  kycCheckStatus?: KYCStatus;

  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus?: DocumentVerificationStatus;

  @ApiPropertyOptional()
  documentVerificationTimestamp?: Date;

  @ApiPropertyOptional()
  kycVerificationTimestamp?: Date;

  @ApiPropertyOptional()
  sanctionLevel?: string;

  @ApiPropertyOptional()
  riskLevel?: string;
}

export class ConsumerEmployeeDetailsDTO {
  @ApiPropertyOptional()
  employeeID?: string;

  @ApiPropertyOptional()
  allocationAmount: number;

  @ApiPropertyOptional()
  allocationCurrency: string;

  @ApiPropertyOptional()
  createdTimestamp: Date;

  @ApiPropertyOptional()
  updatedTimestamp: Date;

  @ApiPropertyOptional()
  employerID?: string;

  @ApiPropertyOptional()
  employerName?: string;
}

export class ConsumerWalletDetailsDTO {
  @ApiPropertyOptional()
  walletProvider?: string;

  @ApiPropertyOptional()
  walletID?: string;
}

export class ConsumerInternalDTO {
  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayEmail?: string;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional()
  referralCode?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  locale?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  isLocked?: boolean;

  @ApiPropertyOptional()
  isDisabled?: boolean;

  @ApiPropertyOptional()
  createdTimestamp?: Date;

  @ApiPropertyOptional()
  updatedTimestamp?: Date;

  @ApiPropertyOptional()
  socialSecurityNumber?: string;

  @ApiPropertyOptional()
  address?: ConsumerInternalAddressDTO;

  @ApiPropertyOptional()
  verificationData?: ConsumerInternalKYCDTO;

  @ApiPropertyOptional()
  referredByID?: string;

  @ApiPropertyOptional({ type: ConsumerWalletDetailsDTO, isArray: true })
  walletDetails?: ConsumerWalletDetailsDTO[];

  @ApiPropertyOptional({ type: ConsumerEmployeeDetailsDTO, isArray: true })
  employeeDetails?: ConsumerEmployeeDetailsDTO[];
}
