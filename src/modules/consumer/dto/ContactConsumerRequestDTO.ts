import { ApiProperty } from "@nestjs/swagger";
import { ContactPhoneDTO } from "./ContactPhoneDTO";

export class ContactConsumerRequestDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [ContactPhoneDTO] })
  phone: ContactPhoneDTO[];

  @ApiProperty()
  email: string[];
}
