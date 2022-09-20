import { ApiProperty } from "@nestjs/swagger";
import { TransactionFilterOptions } from "../domain/Types";

export enum DownloadFormat {
  CSV = "csv",
  PDF = "pdf",
}

export class DownloadTransactionsDTO extends TransactionFilterOptions {
  @ApiProperty({
    description: "Format in which you want the transactions report. Current 'CSV' is supported.",
    enum: Object.values(DownloadFormat),
  })
  reportFormat: DownloadFormat;
}
