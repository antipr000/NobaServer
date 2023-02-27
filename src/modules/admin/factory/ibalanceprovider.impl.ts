export interface IBalanceProviderImpl {
  getBalance(accountNumber): Promise<number>;
}
