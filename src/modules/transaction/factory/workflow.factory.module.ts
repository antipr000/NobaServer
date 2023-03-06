import { Module } from "@nestjs/common";
import { TemporalModule } from "../../../infra/temporal/temporal.module";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { WorkflowFactory } from "./workflow.factory";
import { WalletDepositImpl } from "./wallet.deposit.impl";
import { WalletWithdrawalImpl } from "./wallet.withdrawal.impl";
import { WalletTransferImpl } from "./wallet.transfer.impl";
import { CommonModule } from "../../../modules/common/common.module";
import { PayrollDepositImpl } from "./payroll.deposit.impl";

@Module({
  imports: [PspModule, TemporalModule, MonoModule, CommonModule],
  providers: [WorkflowFactory, WalletDepositImpl, WalletWithdrawalImpl, WalletTransferImpl, PayrollDepositImpl],
  exports: [WorkflowFactory],
})
export class WorkflowFactoryModule {}
