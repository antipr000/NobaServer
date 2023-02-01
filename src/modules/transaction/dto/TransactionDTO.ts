import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";
import { AddTransactionEventDTO, TransactionEventDTO } from "./TransactionEventDTO";
import { FeeType } from "../domain/TransactionFee";

export class ConsumerInformationDTO {
  @ApiProperty({ description: "The unique identifier of the user" })
  id: string;

  @ApiProperty({ description: "The first name of the user" })
  firstName: string;

  @ApiProperty({ description: "The last name of the user" })
  lastName: string;

  @ApiPropertyOptional({ description: "The handle or 'tag' of the user, without $ prefix" })
  handle: string;
}

export class TransactionFeeDTO {
  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: FeeType })
  type: FeeType;

  @ApiProperty()
  currency: string;
}

export class TransactionDTO {
  @ApiProperty({ description: "The reference by which the user identifies this unique transaction" })
  transactionRef: string;

  @ApiProperty({ enum: WorkflowName, description: "The workflow being used to process this transaction" })
  workflowName: WorkflowName;

  @ApiPropertyOptional({ description: "The user whose account is being debited" })
  debitConsumer?: ConsumerInformationDTO;

  @ApiPropertyOptional({ description: "The user whose account is being credited" })
  creditConsumer?: ConsumerInformationDTO;

  @ApiProperty({ description: "The currency of the account being debited" })
  debitCurrency: string;

  @ApiProperty({ description: "The currency of the account being credited" })
  creditCurrency: string;

  @ApiProperty({ description: "The amount debited from the debit user's account in the debitCurrency" })
  debitAmount: number;

  @ApiProperty({ description: "The amount credited to the credit user's account in the creditCurrency" })
  creditAmount: number;

  @ApiProperty({ description: "The exchange rate used to convert the debitAmount to the creditAmount" })
  exchangeRate: string;

  @ApiProperty({ enum: TransactionStatus, description: "The current status of the transaction" })
  status: TransactionStatus;

  @ApiProperty({ description: "The date and time the transaction was created" })
  createdTimestamp: Date;

  @ApiProperty({ description: "The date and time the transaction was last updated" })
  updatedTimestamp: Date;

  @ApiPropertyOptional({ description: "The link used to deposit funds for this transaction" })
  paymentCollectionLink?: string;

  @ApiPropertyOptional({ description: "A memo provided by the user when creating the transaction" })
  memo?: string;

  @ApiPropertyOptional({
    description: "A list of events that have occurred on this transaction",
    type: TransactionEventDTO,
    isArray: true,
  })
  transactionEvents?: TransactionEventDTO[];

  @ApiProperty({
    description: "A list of fees that have been applied to this transaction",
    type: TransactionFeeDTO,
    isArray: true,
  })
  transactionFees: TransactionFeeDTO[];

  @ApiProperty()
  totalFees: number;
}

export class UpdateTransactionDTO {
  @ApiPropertyOptional({ enum: TransactionStatus })
  status?: TransactionStatus;
}

export class UpdateTransactionRequestDTO extends UpdateTransactionDTO {
  @ApiPropertyOptional()
  transactionEvent?: AddTransactionEventDTO;
}
