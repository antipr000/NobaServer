import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpResponseDTO {
    @ApiProperty()
    access_token: string;
}