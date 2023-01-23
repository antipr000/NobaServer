import { ApiProperty } from "@nestjs/swagger";

export class SupportedBanksDTO {
  @ApiProperty({ description: "Returns the bank code." })
  code: string;

  @ApiProperty({ description: "Indicates the format for resource's ID" })
  id: string;

  @ApiProperty({ description: "Returns the bank name." })
  name: string;

  @ApiProperty({ description: "It contains a list of supported account types by a bank" })
  supported_account_types: Array<string>;
}
