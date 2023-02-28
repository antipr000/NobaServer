import { BalanceDTO } from "../dto/balance.dto";

export interface IBalanceProvider {
  getBalance(accountID: string): Promise<BalanceDTO>;
}
