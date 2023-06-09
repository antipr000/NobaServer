import { Module } from "@nestjs/common";
import { TemporalModule } from "../../../../infra/temporal/temporal.module";
import { ConsumerModule } from "../../../../modules/consumer/consumer.module";
import { ExchangeRateModule } from "../../../../modules/exchangerate/exchangerate.module";
import { CommonModule } from "../../../common/common.module";
import { EmployeeModule } from "../../../employee/employee.module";
import { EmployerModule } from "../../../employer/employer.module";
import { CardCreditAdjustmentProcessor } from "./implementations/card.credit.adjustment.processor";
import { CardDebitAdjustmentProcessor } from "./implementations/card.debit.adjustment.processor";
import { CardReversalProcessor } from "./implementations/card.reversal.processor";
import { CardWithdrawalProcessor } from "./implementations/card.withdrawal.processor";
import { CreditAdjustmentProcessor } from "./implementations/credit.adjustment.processor";
import { DebitAdjustmentProcessor } from "./implementations/debit.adjustment.processor";
import { PayrollDepositProcessor } from "./implementations/payroll.deposit.processor";
import { WalletDepositProcessor } from "./implementations/wallet.deposit.processor";
import { WalletTransferProcessor } from "./implementations/wallet.transfer.processor";
import { WalletWithdrawalProcessor } from "./implementations/wallet.withdrawal.processor";
import { TransactionProcessorFactory } from "./transaction.processor.factory";

@Module({
  imports: [CommonModule, TemporalModule, EmployeeModule, EmployerModule, ExchangeRateModule, ConsumerModule],
  providers: [
    TransactionProcessorFactory,
    // Preprocessors + Processors
    PayrollDepositProcessor,
    CardCreditAdjustmentProcessor,
    CardDebitAdjustmentProcessor,
    CardWithdrawalProcessor,
    CardReversalProcessor,
    CreditAdjustmentProcessor,
    DebitAdjustmentProcessor,
    WalletDepositProcessor,
    WalletWithdrawalProcessor,
    WalletTransferProcessor,
  ],
  exports: [TransactionProcessorFactory],
})
export class TransactionPreprocessorModule {}
