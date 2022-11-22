import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationEventHandler,
  NotificationEventType,
} from "../../../modules/notifications/domain/NotificationTypes";
import { KybStatus, KybStatusInfo } from "../domain/KybStatus";

class KybStatusInfoDTO implements KybStatusInfo {
  @ApiProperty({ enum: KybStatus })
  kybStatus: KybStatus;

  @ApiProperty()
  kybProvider: string;
}

export class NotificationConfigurationDTO {
  @ApiProperty({ enum: NotificationEventType })
  notificationEventType: NotificationEventType;

  @ApiProperty()
  notificationEventHandler: NotificationEventHandler[];
}

export class PartnerFeesDTO {
  @ApiProperty()
  takeRate: number;

  @ApiProperty()
  creditCardFeeDiscountPercent: number;

  @ApiProperty()
  nobaFeeDiscountPercent: number;

  @ApiProperty()
  processingFeeDiscountPercent: number;

  @ApiProperty()
  networkFeeDiscountPercent: number;

  @ApiProperty()
  spreadDiscountPercent: number;
}

export class PartnerConfigDTO {
  @ApiPropertyOptional()
  privateWallets?: boolean;

  @ApiPropertyOptional()
  viewOtherWallets?: boolean; // Are wallets for other partners allowed to be seen when the user comes in via this partner?

  @ApiPropertyOptional()
  bypassLogonOTP?: boolean;

  @ApiPropertyOptional()
  bypassWalletOTP?: boolean;

  @ApiPropertyOptional()
  cryptocurrencyAllowList?: string[];

  @ApiProperty()
  fees: PartnerFeesDTO;

  @ApiProperty({ type: [NotificationConfigurationDTO] })
  notificationConfig: NotificationConfigurationDTO[];

  @ApiPropertyOptional()
  logo?: string; // s3 ui for logo

  @ApiPropertyOptional()
  logoSmall?: string; //s3 uri for small logo
}

export class PartnerDTO {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  verificationData?: KybStatusInfoDTO;

  @ApiProperty()
  apiKey: string;

  @ApiProperty()
  apiKeyForEmbed: string;

  @ApiProperty()
  secretKey: string;

  @ApiProperty()
  webhookClientID: string;

  @ApiProperty()
  webhookSecret: string;

  @ApiPropertyOptional()
  logoSmall?: string;

  @ApiPropertyOptional()
  logo?: string;

  @ApiPropertyOptional()
  config?: PartnerConfigDTO;

  @ApiPropertyOptional()
  isAPIEnabled?: boolean;

  @ApiPropertyOptional()
  isEmbedEnabled?: boolean;
}
