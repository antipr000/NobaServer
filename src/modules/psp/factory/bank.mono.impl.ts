import { Inject } from "@nestjs/common";
import { IBankImpl } from "./ibank.impl";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { MonoCurrency, MonoTransactionType } from "../domain/Mono";
import { MonoWorkflowService } from "../mono/mono.workflow.service";

export class BankMonoImpl implements IBankImpl {
  @Inject()
  private readonly monoWorkflowService: MonoWorkflowService;

  async getBalance(accountID: string): Promise<number> {
    return 1;
  }

  async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    const withdrawal = await this.monoWorkflowService.createMonoTransaction({
      type: MonoTransactionType.WITHDRAWAL,
      amount: request.amount,
      currency: request.currency as MonoCurrency,
      nobaTransactionID: request.transactionID,
      nobaPublicTransactionRef: request.transactionRef,
      consumerID: request.consumerID,
      withdrawalDetails: {
        bankCode: request.bankCode,
        encryptedAccountNumber: request.accountNumber,
        accountType: request.accountType,
        documentNumber: request.documentNumber,
        documentType: request.documentType,
      },
    });

    return {
      withdrawalID: withdrawal.id,
      state: withdrawal.state,
      declinationReason: withdrawal.withdrawalDetails.declinationReason,
    };
  }
}
