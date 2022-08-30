import { ApiProperty } from "@nestjs/swagger";

export class CreditCardDTO {
  @ApiProperty()
  issuer: string;

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
}

export const unsupportedIssuers: string[] = ["chase", "capital_one"];

export enum CardType {
  DEBIT = "Debit",
  CREDIT = "Credit",
}

export enum BINValidity {
  UNKNOWN = "Unknown",
  SUPPORTED = "Supported",
  NOT_SUPPORTED = "NotSupported",
}
