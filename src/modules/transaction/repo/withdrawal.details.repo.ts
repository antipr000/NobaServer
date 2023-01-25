import { InputWithdrawalDetails, WithdrawalDetails } from "../domain/WithdrawalDetails";

export interface IWithdrawalDetailsRepo {
  getWithdrawalDetails(transactionID: string): Promise<WithdrawalDetails>;
  addWithdrawalDetails(withdrawalDetails: InputWithdrawalDetails): Promise<WithdrawalDetails>;
}
