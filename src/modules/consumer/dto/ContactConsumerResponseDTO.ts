import { ApiProperty } from "@nestjs/swagger";
import { ContactPhoneDTO } from "./ContactPhoneDTO";

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
