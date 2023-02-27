import { ApiProperty } from "@nestjs/swagger";

export class AccountBalanceDTO {
  @ApiProperty()
  accountID: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  currency: string;
}
