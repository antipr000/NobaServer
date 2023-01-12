import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";
import { AddTransactionEventDTO, TransactionEventDTO } from "./TransactionEventDTO";

export class ConsumerInformationDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  handle: string;
}

export class TransactionDTO {
  @ApiProperty()
  transactionRef: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiPropertyOptional()
  debitConsumer?: ConsumerInformationDTO;

  @ApiPropertyOptional()
  creditConsumer?: ConsumerInformationDTO;

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

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;

  @ApiPropertyOptional()
  memo?: string;

  @ApiPropertyOptional()
  transactionEvents?: TransactionEventDTO[];
}

export class UpdateTransactionDTO {
  @ApiPropertyOptional({ enum: TransactionStatus })
  status?: TransactionStatus;
}

export class UpdateTransactionRequestDTO extends UpdateTransactionDTO {
  @ApiPropertyOptional()
  transactionEvent?: AddTransactionEventDTO;
}
