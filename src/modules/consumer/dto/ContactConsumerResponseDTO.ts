import { ApiProperty } from "@nestjs/swagger";

export class ContactConsumerResponseDTO {
  @ApiProperty()
  consumerID: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  handle: string;
}
