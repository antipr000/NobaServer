import { ApiProperty } from "@nestjs/swagger";
import { IdentityType } from "../domain/IdentityType";

export class VerifyOtpRequestDTO {
    @ApiProperty()
    emailOrPhone: string;

    @ApiProperty()
    otp: number;

    @ApiProperty()
    identityType: IdentityType;
}