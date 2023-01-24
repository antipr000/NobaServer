import { Inject, Injectable } from "@nestjs/common";
import { WorkflowName } from "../domain/Transaction";
import { WalletDepositImpl } from "./wallet.deposit.impl";
import { WalletWithdrawalImpl } from "./wallet.withdrawal.impl";
import { WalletTransferImpl } from "./wallet.transfer.impl";
import { IWorkflowImpl } from "./iworkflow.impl";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";

@Injectable()
export class WorkflowFactory {
  @Inject()
  private readonly walletDepositImpl: WalletDepositImpl;

  @Inject()
  private readonly walletWithdrawalImpl: WalletWithdrawalImpl;

  @Inject()
  private readonly walletTransferImpl: WalletTransferImpl;

  getWorkflowImplementation(workflowName: WorkflowName): IWorkflowImpl {
    switch (workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositImpl;
      case WorkflowName.WALLET_TRANSFER:
        return this.walletTransferImpl;
      case WorkflowName.WALLET_WITHDRAWAL:
        return this.walletWithdrawalImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow name",
        });
    }
  }
}
