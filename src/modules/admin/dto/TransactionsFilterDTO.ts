import { ApiProperty } from "@nestjs/swagger";


export class TransactionsFilterDTO {
    @ApiProperty({
        description: "Format: YYYY-MM-DD, example: 2010-04-27"
    })
    startDate: string;

    @ApiProperty({
        description: "Format: YYYY-MM-DD, example: 2010-04-27"
    })
    endDate: string;
}