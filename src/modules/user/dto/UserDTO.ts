import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../domain/Address";
import { UserProps } from "../domain/User";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../domain/VerificationStatus";

export class UserDTO implements Partial<UserProps> {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  version?: number;

  @ApiProperty()
  createdAt?: string;

  @ApiProperty()
  updatedAt?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ enum: ConsumerVerificationStatus })
  idVerificationStatus?: string;

  @ApiPropertyOptional({ enum: DocumentVerificationStatus })
  documentVerificationStatus?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  address?: Address;
}
