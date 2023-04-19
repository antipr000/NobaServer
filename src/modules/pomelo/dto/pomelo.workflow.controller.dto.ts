import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransactionStatus,
  PomeloTransactionType,
} from "../domain/PomeloTransaction";

export class PomeloTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pomeloTransactionID: string;

  @ApiProperty()
  parentPomeloTransactionID: string;

  @ApiProperty()
  pomeloIdempotencyKey: string;

  @ApiProperty()
  nobaTransactionID: string;

  @ApiProperty()
  pomeloCardID: string;

  @ApiProperty()
  pomeloUserID: string;

  @ApiProperty()
  amountInUSD: number;

  @ApiProperty()
  amountInLocalCurrency: number;

  @ApiProperty({ enum: PomeloCurrency })
  localCurrency: PomeloCurrency;

  @ApiProperty()
  settlementAmount: number;

  @ApiProperty({ enum: PomeloCurrency })
  settlementCurrency: PomeloCurrency;

  @ApiProperty({ enum: PomeloTransactionStatus })
  status: PomeloTransactionStatus;

  @ApiProperty({ enum: PomeloTransactionType })
  pomeloTransactionType: PomeloTransactionType;

  @ApiProperty({ enum: PomeloPointType })
  pointType: PomeloPointType;

  @ApiProperty({ enum: PomeloEntryMode })
  entryMode: PomeloEntryMode;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ enum: PomeloOrigin })
  origin: PomeloOrigin;

  @ApiProperty({ enum: PomeloSource })
  source: PomeloSource;

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;
}
