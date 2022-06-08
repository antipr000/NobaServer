import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpRequestDTO {
    @ApiProperty()
    emailOrPhone: string;

    @ApiProperty()
    otp: number;

    @ApiProperty()
    identityType: string;
}