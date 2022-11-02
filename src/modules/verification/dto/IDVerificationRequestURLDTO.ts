import { ApiProperty } from "@nestjs/swagger";

export enum IDVerificationURLRequestLocale {
  EN_US = "en-us",
  ES_LATAM = "es-419",
}

export class IDVerificationURLResponseDTO {
  @ApiProperty({ description: "Unique ID for this identity verification request" })
  id: string;

  @ApiProperty({ description: "URL for identity verification document capture redirect" })
  url: string;

  @ApiProperty({ description: "Expiration time of the url (in ms since the epoch)" })
  expiration: number;
}
