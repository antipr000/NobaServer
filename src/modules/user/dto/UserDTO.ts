import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DOB } from "src/externalclients/idvproviders/definitions";
import { Address } from "../domain/Address";
import { UserProps } from "../domain/User";
import { VerificationStatusType } from "../domain/Types";

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

  @ApiPropertyOptional({ enum: Object.values(VerificationStatusType) })
  verificationStatus?: string;

  @ApiPropertyOptional()
  documentVerified?: boolean;

  @ApiPropertyOptional()
  dateOfBirth?: DOB;

  @ApiPropertyOptional()
  address?: Address;
}
