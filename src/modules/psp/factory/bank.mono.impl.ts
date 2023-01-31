import { Inject } from "@nestjs/common";
import { IBankImpl } from "./ibank.impl";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { MonoService } from "../mono/mono.service";
import { MonoCurrency, MonoTransactionType } from "../domain/Mono";

export class BankMonoImpl implements IBankImpl {
  @Inject()
  private readonly monoService: MonoService;

  async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    const withdrawal = await this.monoService.createMonoTransaction({
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