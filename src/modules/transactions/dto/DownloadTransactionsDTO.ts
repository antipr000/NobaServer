import { ApiProperty } from "@nestjs/swagger";


export class DownloadTransactionsDTO {
    @ApiProperty({
        description: "Format: YYYY-MM-DD, example: 2010-04-27"
    })
    startDate: string;

    @ApiProperty({
        description: "Format: YYYY-MM-DD, example: 2010-04-27"
    })
    endDate: string;

    @ApiProperty({
        description: "Format in which you want the transactions report. Current 'CSV' is supported."
    })
    reportFormat: DownloadFormat

}

export enum DownloadFormat {
    CSV = 1,
    PDF = 2
}