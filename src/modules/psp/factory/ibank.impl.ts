import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";

export interface IBankImpl {
  debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse>;
}
