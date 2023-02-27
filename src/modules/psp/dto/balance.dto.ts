import { ApiProperty } from "@nestjs/swagger";

export class BalanceDTO {
  @ApiProperty({ description: "Balance on the account" })
  balance: number;

  @ApiProperty({ description: "Currency of the balance" })
  currency: string;
}
