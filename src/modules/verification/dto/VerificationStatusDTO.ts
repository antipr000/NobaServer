import { ApiProperty } from "@nestjs/swagger";
import {
  TransactionStatus,
  TransactionStatusResponse,
} from "../../../externalclients/idvproviders/providers/trulioo/TruliooDefinitions";

export class VerificationStatusDTO implements TransactionStatusResponse {
  @ApiProperty()
  TransactionId: string;

  @ApiProperty()
  TransactionRecordId: string;

  @ApiProperty({ enum: TransactionStatus })
  Status: TransactionStatus;

  @ApiProperty()
  UploadedDt: string;

  @ApiProperty()
  IsTimedOut: boolean;
}
