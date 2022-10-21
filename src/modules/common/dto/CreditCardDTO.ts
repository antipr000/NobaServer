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

// Source: https://www.banks.com/articles/investing/cryptocurrency/banks-that-accept-bitcoin/#:~:text=TD%20Bank%20and%20PNC%20Bank%20have%20also%20blocked,known%20as%20cryptocurrency%29%20have%20had%20a%20wild%20ride
export const unsupportedIssuers: string[] = [
  "bank_of_america",
  "bankofamerica",
  "chase",
  "citi",
  "citibank",
  "citibank_berhad",
  "citibank_n_a",
  "citicard", // Verify this is Citibank
  "citibank_south_dakota_n_a",
  "citibank_usa_national_association",
  "citibank_international_plc_visa_dankort",
  "lloyds",
  "lloyds_tsb",
  "halifax",
  "bank_of_scotland",
  "royal_bank_of_scotland",
  "mbna",
  "mbna_america",
  "mbna_europe_bank_ltd",
  "wells_fargo",
  "wells_fargo_bank_arizona_n_a",
  "wells_fargo_bank_iowa_national_association",
  "wells_fargo_bank_nevada_n_a",
  "wells_fargo_financial_bank",
  "wells_fargo_bank_n_a",
  "commonwealth_bank_of_australia",
  "commonwealth",
  "commonwealth_bank",
  "capitalone",
  "capital_one",
  "capital_one_bank",
  "capital_one_inc",
  "capital_one_bank_of_canada_branch",
  "discover_issued",
  "discover_card",
  // Oddly, Virgin Money is not in the all_bins.csv list
  // What to do with the "Visa" entry on the web page?
  "td_banknorth",
  "td_canada_trust",
  "tdbank",
  "tdcanadatrust",
  "the_toronto_dominion_bank",
  "toronto_dominion_bank",
  "pncbank",
  "pnc_bank_n_a",
  "pnc_national_bank_of_delaware",
  "royal_bank_of_canada",
];

export enum CardType {
  DEBIT = "Debit",
  CREDIT = "Credit",
}

export enum BINValidity {
  UNKNOWN = "Unknown",
  SUPPORTED = "Supported",
  NOT_SUPPORTED = "NotSupported",
}
