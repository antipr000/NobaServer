import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";

export interface IDebitProvider {
  debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse>;
}
