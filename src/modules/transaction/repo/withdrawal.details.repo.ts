import { InputWithdrawalDetails, WithdrawalDetails } from "../domain/WithdrawalDetails";

export interface IWithdrawalDetailsRepo {
  getWithdrawalDetailsByTransactionID(transactionID: string): Promise<WithdrawalDetails>;
  addWithdrawalDetails(withdrawalDetails: InputWithdrawalDetails): Promise<WithdrawalDetails>;
}
