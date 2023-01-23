import { Module } from "@nestjs/common";
import { TemporalModule } from "../../../infra/temporal/temporal.module";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { WorkflowFactory } from "./WorkflowFactory";
import { WalletDepositImpl } from "./WalletDepositImpl";
import { WalletWithdrawalImpl } from "./WalletWithdrawalImpl";
import { WalletTransferImpl } from "./WalletTransferImpl";
import { CommonModule } from "../../../modules/common/common.module";

@Module({
  imports: [PspModule, TemporalModule, MonoModule, CommonModule],
  providers: [WorkflowFactory, WalletDepositImpl, WalletWithdrawalImpl, WalletTransferImpl],
  exports: [WorkflowFactory],
})
export class WorkflowFactoryModule {}
