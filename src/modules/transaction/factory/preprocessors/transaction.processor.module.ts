import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../../modules/consumer/consumer.module";
import { ExchangeRateModule } from "../../../../modules/exchangerate/exchangerate.module";
import { CommonModule } from "../../../common/common.module";
import { EmployeeModule } from "../../../employee/employee.module";
import { EmployerModule } from "../../../employer/employer.module";
import { CardCreditAdjustmentPreprocessor } from "./implementations/card.credit.adjustment.preprocessor";
import { CardDebitAdjustmentPreprocessor } from "./implementations/card.debit.adjustment.preprocessor";
import { CardReversalPreprocessor } from "./implementations/card.reversal.preprocessor";
import { CardWithdrawalPreprocessor } from "./implementations/card.withdrawal.preprocessro";
import { CreditAdjustmentPreprocessor } from "./implementations/credit.adjustment.preprocessor";
import { DebitAdjustmentPreprocessor } from "./implementations/debit.adjustment.preprocessor";
import { PayrollDepositPreprocessor } from "./implementations/payroll.deposit.preprocessor";
import { WalletDepositProcessor } from "./implementations/wallet.deposit.processor";
import { WalletWithdrawalProcessor } from "./implementations/wallet.withdrawal.processor";
import { TransactionProcessorFactory } from "./transaction.processor.factory";

@Module({
  imports: [CommonModule, EmployeeModule, EmployerModule, ExchangeRateModule, ConsumerModule],
  providers: [
    TransactionProcessorFactory,
    // Preprocessors
    PayrollDepositPreprocessor,
    CardCreditAdjustmentPreprocessor,
    CardDebitAdjustmentPreprocessor,
    CardWithdrawalPreprocessor,
    CardReversalPreprocessor,
    CreditAdjustmentPreprocessor,
    DebitAdjustmentPreprocessor,
    WalletDepositProcessor,
    WalletWithdrawalProcessor,
  ],
  exports: [TransactionProcessorFactory],
})
export class TransactionPreprocessorModule {}
