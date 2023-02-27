import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { BalanceDTO } from "../dto/balance.dto";

export interface IBankImpl {
  debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse>;
  getBalance(accountID: string): Promise<BalanceDTO>;
}
