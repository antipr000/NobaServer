import { anyString, anything, mock, when } from "ts-mockito";
import { IWithdrawalDetailsRepo } from "../repo/withdrawal.details.repo";
import { SQLWithdrawalDetailsRepo } from "../repo/sql.withdrawal.details.repo";

export function getMockWithdrawalDetailsRepoWithDefaults(): IWithdrawalDetailsRepo {
  const withdrawalDetailsRepo = mock(SQLWithdrawalDetailsRepo);
  when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(anyString())).thenReject(new Error("Not implemented"));
  when(withdrawalDetailsRepo.addWithdrawalDetails(anything())).thenReject(new Error("Not implemented"));

  return withdrawalDetailsRepo;
}
