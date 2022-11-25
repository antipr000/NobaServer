import { ApiProperty } from "@nestjs/swagger";

export class ConsumerHandleDTO {
  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  handle: string;
}
