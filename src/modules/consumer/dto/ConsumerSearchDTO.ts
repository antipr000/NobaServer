import { ApiProperty } from "@nestjs/swagger";

export class ConsumerSearchDTO {
  @ApiProperty()
  consumerID: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  handle: string;
}
