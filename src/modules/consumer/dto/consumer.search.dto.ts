import { ApiPropertyOptional } from "@nestjs/swagger";
import { KYCStatus } from "@prisma/client";

export class ConsumerSearchDTO {
  @ApiPropertyOptional()
  consumerID?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional({ enum: KYCStatus })
  kycStatus?: KYCStatus;
}

export class FindConsumerByStructuredFieldsDTO {
  phone?: string;

  email?: string;

  name?: string;

  handle?: string;

  kycStatus?: KYCStatus;
}
