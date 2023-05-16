import { Inject, Injectable } from "@nestjs/common";
import { WorkflowName } from "../domain/Transaction";
import { WalletDepositImpl } from "./wallet.deposit.impl";
import { WalletWithdrawalImpl } from "./wallet.withdrawal.impl";
import { WalletTransferImpl } from "./wallet.transfer.impl";
import { IWorkflowImpl } from "./iworkflow.impl";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { PayrollDepositImpl } from "./payroll.deposit.impl";
import { CreditAdjustmentImpl } from "./credit.adjustment.impl";
import { DebitAdjustmentImpl } from "./debit.adjustment.impl";

@Injectable()
export class WorkflowFactory {
  @Inject()
  private readonly walletDepositImpl: WalletDepositImpl;

  @Inject()
  private readonly walletWithdrawalImpl: WalletWithdrawalImpl;

  @Inject()
  private readonly walletTransferImpl: WalletTransferImpl;

  @Inject()
  private readonly payrollDepositImpl: PayrollDepositImpl;

  @Inject()
  private readonly creditAdjustmentImpl: CreditAdjustmentImpl;

  @Inject()
  private readonly debitAdjustmentImpl: DebitAdjustmentImpl;

  getWorkflowImplementation(workflowName: WorkflowName): IWorkflowImpl {
    switch (workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositImpl;
      case WorkflowName.WALLET_TRANSFER:
        return this.walletTransferImpl;
      case WorkflowName.WALLET_WITHDRAWAL:
        return this.walletWithdrawalImpl;
      case WorkflowName.PAYROLL_DEPOSIT:
        return this.payrollDepositImpl;
      case WorkflowName.CREDIT_ADJUSTMENT:
        return this.creditAdjustmentImpl;
      case WorkflowName.DEBIT_ADJUSTMENT:
        return this.debitAdjustmentImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow name",
        });
    }
  }
}
