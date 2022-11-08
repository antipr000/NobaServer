import { ApiProperty } from "@nestjs/swagger";

export class PhoneVerificationOtpRequest {
  @ApiProperty()
  phone: string;
}

export class UserPhoneUpdateRequest {
  @ApiProperty()
  phone: string;

  @ApiProperty()
  otp: number;
}
