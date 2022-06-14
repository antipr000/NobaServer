import { ApiProperty } from "@nestjs/swagger";
import { PartnerProps } from "../../partner/domain/Partner";

export class AddPartnerRequestDTO implements Partial<PartnerProps> {
  @ApiProperty()
  name: string;
}
