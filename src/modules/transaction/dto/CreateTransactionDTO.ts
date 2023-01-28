import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowName } from "../domain/Transaction";
import { WithdrawalDTO } from "./WithdrawalDTO";
import { TransactionFlags } from "../domain/TransactionFlags";

export class InitiateTransactionDTO {
  @ApiPropertyOptional()
  debitConsumerIDOrTag?: string;

  @ApiPropertyOptional()
  creditConsumerIDOrTag?: string;

  @ApiProperty({ enum: WorkflowName })
  workflowName: WorkflowName;

  @ApiPropertyOptional({ enum: Currency })
  debitCurrency?: Currency;

  @ApiPropertyOptional()
  debitAmount?: number;

  @ApiPropertyOptional({ enum: Currency })
  creditCurrency?: Currency;

  @ApiPropertyOptional()
  creditAmount?: number;

  @ApiPropertyOptional()
  exchangeRate?: number;

  @ApiPropertyOptional()
  memo?: string;

  @ApiPropertyOptional({ type: TransactionFlags, isArray: true })
  options?: TransactionFlags[];

  @ApiPropertyOptional({ type: WithdrawalDTO })
  withdrawalData?: WithdrawalDTO;
}
