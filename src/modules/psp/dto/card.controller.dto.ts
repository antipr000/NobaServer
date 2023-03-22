import { ApiProperty } from "@nestjs/swagger";

export class CardResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerUserID: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  lastFour: string;
}
