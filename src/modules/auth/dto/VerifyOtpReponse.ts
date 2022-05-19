import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpResponseDTO {
    @ApiProperty()
    access_token: string;

    @ApiProperty()
    user_id: string;
}