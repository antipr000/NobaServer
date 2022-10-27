import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreditCardDTO {
  @ApiPropertyOptional()
  issuer?: string;

  @ApiProperty()
  network: string;

  @ApiProperty()
  bin: string;

  @ApiProperty()
  type: CardType;

  @ApiProperty()
  supported: BINValidity;

  @ApiProperty()
  digits: number;

  @ApiProperty()
  cvvDigits: number;

  @ApiPropertyOptional()
  mask?: string;
}

export class BINReportDetails {
  supported: number;
  unsupported: number;
}

export enum CardType {
  DEBIT = "Debit",
  CREDIT = "Credit",
}

export enum BINValidity {
  UNKNOWN = "Unknown",
  SUPPORTED = "Supported",
  NOT_SUPPORTED = "NotSupported",
}
