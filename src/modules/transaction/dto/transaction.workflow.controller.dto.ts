import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BankName } from "../../../modules/psp/domain/BankName";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";

export class WorkflowTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiPropertyOptional()
  debitConsumerID?: string;

  @ApiPropertyOptional()
  creditConsumerID?: string;

  @ApiProperty()
  debitCurrency: string;

  @ApiProperty()
  creditCurrency: string;

  @ApiProperty()
  debitAmount: number;

  @ApiProperty()
  creditAmount: number;

  @ApiProperty()
  exchangeRate: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;
}

export class DebitBankRequestDTO {
  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: BankName })
  bankName: BankName;
}
