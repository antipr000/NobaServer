import { ApiProperty } from "@nestjs/swagger";

export class SendNotificationRequestDTO {
  @ApiProperty()
  transactionID: string;
}
