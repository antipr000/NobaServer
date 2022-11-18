import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { KybStatus, KybStatusInfo } from "../domain/KybStatus";
import { PartnerConfig } from "../domain/Partner";

class KybStatusInfoDTO implements KybStatusInfo {
  @ApiProperty({ enum: KybStatus })
  kybStatus: KybStatus;

  @ApiProperty()
  kybProvider: string;
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
  apiKeyForEmbed?: string;

  @ApiPropertyOptional()
  webhookClientID?: string;

  @ApiPropertyOptional()
  webhookSecret?: string;

  // TODO: Ask what should be in config?
  @ApiPropertyOptional()
  config?: PartnerConfig;

  @ApiPropertyOptional()
  isAPIEnabled?: boolean;

  @ApiPropertyOptional()
  isEmbedEnabled?: boolean;
}
