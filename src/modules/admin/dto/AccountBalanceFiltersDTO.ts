import { ApiProperty } from "@nestjs/swagger";
import { ACCOUNT_BALANCE_TYPES } from "../domain/Admin";

export class AccountBalanceFiltersDTO {
  @ApiProperty({
    enum: Object.values(ACCOUNT_BALANCE_TYPES),
    description: "filter for a particular account type for balance",
  })
  accountBalanceType: ACCOUNT_BALANCE_TYPES;

  @ApiProperty({ description: "filter for a list of account IDs" })
  accountIDs: string[];
}
