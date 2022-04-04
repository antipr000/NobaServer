import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpRequestDTO {
    @ApiProperty()
    email: string;

    @ApiProperty()
    otp: number;
}