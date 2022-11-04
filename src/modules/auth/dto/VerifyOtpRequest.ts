import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LoginRequestDTO } from "./LoginRequest";

export class VerifyOtpRequestDTO extends LoginRequestDTO {
  @ApiProperty()
  otp: number;

  @ApiPropertyOptional({ description: "Creates a user account if user doesn't exist already" })
  createAccountIfNotExists?: boolean;
}
