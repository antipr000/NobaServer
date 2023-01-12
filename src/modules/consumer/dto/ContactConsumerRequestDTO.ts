import { ApiProperty } from "@nestjs/swagger";
import { ContactPhoneDTO } from "./ContactPhoneDTO";

export class ContactConsumerRequestDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  phone: ContactPhoneDTO[];

  @ApiProperty()
  email: string[];
}
