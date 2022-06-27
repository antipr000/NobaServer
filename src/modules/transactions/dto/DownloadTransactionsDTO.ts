import { ApiProperty } from "@nestjs/swagger";
import { TransactionFilterDTO } from "./TransactionFilterDTO";

export enum DownloadFormat {
  CSV = "csv",
  PDF = "pdf",
}

export class DownloadTransactionsDTO extends TransactionFilterDTO {
  @ApiProperty({
    description: "Format in which you want the transactions report. Current 'CSV' is supported.",
    enum: Object.values(DownloadFormat),
  })
  reportFormat: DownloadFormat;
}
