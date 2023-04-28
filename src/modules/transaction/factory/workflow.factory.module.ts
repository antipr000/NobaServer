import { Module } from "@nestjs/common";
import { TemporalModule } from "../../../infra/temporal/temporal.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { WorkflowFactory } from "./workflow.factory";
import { WalletDepositImpl } from "./wallet.deposit.impl";
import { WalletWithdrawalImpl } from "./wallet.withdrawal.impl";
import { WalletTransferImpl } from "./wallet.transfer.impl";
import { CommonModule } from "../../../modules/common/common.module";
import { PayrollDepositImpl } from "./payroll.deposit.impl";
import { ExchangeRateModule } from "../../exchangerate/exchangerate.module";
import { MonoPublicModule } from "src/modules/mono/public/mono.public.module";

@Module({
  imports: [PspModule, TemporalModule, CommonModule, ExchangeRateModule, MonoPublicModule],
  providers: [WorkflowFactory, WalletDepositImpl, WalletWithdrawalImpl, WalletTransferImpl, PayrollDepositImpl],
  exports: [WorkflowFactory],
})
export class WorkflowFactoryModule {}
