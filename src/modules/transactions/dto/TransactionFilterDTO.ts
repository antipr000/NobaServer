import { ApiPropertyOptional } from "@nestjs/swagger";

export class TransactionFilterDTO {
  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  startDate: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  endDate: string;
}
