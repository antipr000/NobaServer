import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpResponseDTO {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  userID: string;
}
