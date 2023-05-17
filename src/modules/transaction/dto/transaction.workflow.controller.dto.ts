import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { TransactionFeeDTO } from "./TransactionDTO";
import { TransactionEventDTO } from "./TransactionEventDTO";

export class WorkflowTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "The reference by which the user identifies this unique transaction" })
  transactionRef: string;

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

  @ApiPropertyOptional({ description: "A memo provided by the user when creating the transaction" })
  memo?: string;

  @ApiPropertyOptional({
    description: "A list of events that have occurred on this transaction",
    type: TransactionEventDTO,
    isArray: true,
  })
  transactionEvents: TransactionEventDTO[];

  @ApiProperty({
    description: "A list of fees that have been applied to this transaction",
    type: TransactionFeeDTO,
    isArray: true,
  })
  transactionFees: TransactionFeeDTO[];

  @ApiProperty()
  totalFees: number;
}

export class DebitBankRequestDTO {
  @ApiProperty()
  transactionID: string;
}

export class PayrollTransactionRequestDTO {
  @ApiProperty()
  disbursementID: string;
}

export class PomeloTransactionRequestDTO {
  @ApiProperty()
  creditAmount: number;

  @ApiProperty({ enum: Currency })
  creditCurrency: Currency;

  @ApiProperty()
  debitAmount: number;

  @ApiProperty({ enum: Currency })
  debitCurrency: Currency;

  @ApiProperty()
  exchangeRate: number;

  @ApiProperty()
  memo: string;

  @ApiPropertyOptional()
  debitConsumerID?: string;

  @ApiPropertyOptional()
  creditConsumerID?: string;
}

export class CreateTransactionDTO {
  @ApiPropertyOptional({ enum: WorkflowName })
  transactionType: WorkflowName;

  @ApiPropertyOptional()
  payrollTransactionRequest?: PayrollTransactionRequestDTO;

  @ApiPropertyOptional()
  pomeloTransactionRequest?: PomeloTransactionRequestDTO;
}
