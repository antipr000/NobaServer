import { ApiProperty } from "@nestjs/swagger";

export class SessionResponseDTO {
  @ApiProperty()
  sessionToken: string;
}
