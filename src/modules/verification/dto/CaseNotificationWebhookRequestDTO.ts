import { ApiProperty } from "@nestjs/swagger";
import { CaseNotificationWebhookRequest } from "../integrations/SardineTypeDefinitions";
import { ActionDTO, CaseDTO } from "./WebhookCommonDTO";

export class CaseNotificationDataDTO {
  @ApiProperty()
  action: ActionDTO;

  @ApiProperty()
  case: CaseDTO;
}

export class CaseNotificationWebhookRequestDTO implements CaseNotificationWebhookRequest {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  data: CaseNotificationDataDTO;
}
