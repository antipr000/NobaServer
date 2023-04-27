import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmailData {
  @ApiProperty()
  to: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty()
  dynamicTemplateData: object;
}

export class SMSData {
  @ApiProperty()
  recipientPhoneNumber: string;

  @ApiProperty()
  body: string;
}

export class PushData {
  @ApiProperty()
  token: string;

  @ApiProperty()
  templateKey: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  notificationType: string;

  @ApiPropertyOptional()
  transferCounterPartyHandle?: string;

  @ApiPropertyOptional()
  transactionRef?: string;
}

export class LatestNotificationResponse {
  @ApiPropertyOptional()
  emailData?: EmailData[];

  @ApiPropertyOptional()
  smsData?: SMSData[];

  @ApiPropertyOptional()
  pushData?: PushData[];
}
