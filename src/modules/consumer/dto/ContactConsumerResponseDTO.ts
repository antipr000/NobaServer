import { ApiProperty } from "@nestjs/swagger";
import { ContactPhoneDTO } from "./ContactPhoneDTO";

export class ContactConsumerResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  consumerID: string;

  @ApiProperty()
  handle: string;
}
