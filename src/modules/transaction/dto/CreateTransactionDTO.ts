import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";
import { WithdrawalDTO } from "./WithdrawalDTO";
import { TransactionFlags } from "../domain/TransactionFlags";
import { ConsumerWorkflowName } from "../../../infra/temporal/workflow";

export class InitiateTransactionDTO {
  @ApiPropertyOptional()
  debitConsumerIDOrTag?: string;

  @ApiPropertyOptional()
  creditConsumerIDOrTag?: string;

  @ApiProperty({ enum: ConsumerWorkflowName })
  workflowName: ConsumerWorkflowName;

  @ApiPropertyOptional({ enum: Currency })
  debitCurrency?: Currency;

  @ApiPropertyOptional()
  debitAmount?: number;

  @ApiPropertyOptional({ enum: Currency })
  creditCurrency?: Currency;

  @ApiPropertyOptional()
  creditAmount?: number;

  @ApiPropertyOptional()
  memo?: string;

  @ApiPropertyOptional({ enum: TransactionFlags, isArray: true })
  options?: TransactionFlags[];

  @ApiPropertyOptional({ type: WithdrawalDTO })
  withdrawalData?: WithdrawalDTO;
}
