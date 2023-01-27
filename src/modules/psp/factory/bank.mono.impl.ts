import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { Inject } from "@nestjs/common";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { IBankImpl } from "./ibank.impl";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { MonoService } from "../mono/mono.service";

export class BankMonoImpl implements IBankImpl {
  @Inject()
  private readonly monoService: MonoService;

  async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    const withdrawal = await this.monoService.debitFromNoba({
      amount: request.amount,
      currency: request.currency,
      transactionID: request.transactionID,
      transactionRef: request.transactionRef,
      consumerID: request.consumerID,
      bankCode: request.bankCode,
      accountNumber: request.accountNumber,
      accountType: request.accountType,
      documentNumber: request.documentNumber,
      documentType: request.documentType,
    });

    return withdrawal;
  }
}
