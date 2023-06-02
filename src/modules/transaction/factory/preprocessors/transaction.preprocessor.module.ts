import { Module } from "@nestjs/common";
import { CommonModule } from "src/modules/common/common.module";
import { EmployeeModule } from "src/modules/employee/employee.module";
import { EmployerModule } from "src/modules/employer/employer.module";
import { CardCreditAdjustmentPreprocessor } from "./implementations/card.credit.adjustment.preprocessor";
import { CardDebitAdjustmentPreprocessor } from "./implementations/card.debit.adjustment.preprocessor";
import { CardReversalPreprocessor } from "./implementations/card.reversal.preprocessor";
import { CardWithdrawalPreprocessor } from "./implementations/card.withdrawal.preprocessro";
import { CreditAdjustmentPreprocessor } from "./implementations/credit.adjustment.preprocessor";
import { DebitAdjustmentPreprocessor } from "./implementations/debit.adjustment.preprocessor";
import { PayrollDepositPreprocessor } from "./implementations/payroll.deposit.preprocessor";
import { TransactionPreprocessorFactory } from "./transaction.preprocessor.factory";

@Module({
  imports: [CommonModule, EmployeeModule, EmployerModule],
  providers: [
    TransactionPreprocessorFactory,
    // Preprocessors
    PayrollDepositPreprocessor,
    CardCreditAdjustmentPreprocessor,
    CardDebitAdjustmentPreprocessor,
    CardWithdrawalPreprocessor,
    CardReversalPreprocessor,
    CreditAdjustmentPreprocessor,
    DebitAdjustmentPreprocessor,
  ],
  exports: [TransactionPreprocessorFactory],
})
export class TransactionPreprocessorModule {}
