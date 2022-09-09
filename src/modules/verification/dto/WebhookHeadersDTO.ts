import { ApiProperty } from "@nestjs/swagger";

export class WebhookHeadersDTO {
  @ApiProperty()
  "x-sardine-signature": string;
}
