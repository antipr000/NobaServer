import { ApiProperty } from "@nestjs/swagger";

export class TransactionStatsDTO {
    @ApiProperty()
    numTransactions: number;

    @ApiProperty()
    totalAmount: number;
}