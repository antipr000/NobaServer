import { ApiProperty } from "@nestjs/swagger";

export class EmailVerificationOtpRequest {
  @ApiProperty()
  email: string;
}

export class UserEmailUpdateRequest {
  @ApiProperty()
  email: string;

  @ApiProperty()
  otp: number;
}
