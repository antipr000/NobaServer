import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { KybStatus, KybStatusInfo } from "../domain/KybStatus";

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
  verificationData: KybStatusInfoDTO;

  @ApiPropertyOptional()
  takeRate: number;
}
