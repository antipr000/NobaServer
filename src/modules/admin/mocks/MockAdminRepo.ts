import { anyString, anything, mock, when } from "ts-mockito";
import { IAdminRepo, SQLAdminRepo } from "../repos/transactions/sql.admin.repo";

export const getMockAdminRepoWithDefaults = () => {
  const mockAdminTransactionRepo: IAdminRepo = mock(SQLAdminRepo);

  when(mockAdminTransactionRepo.getTransactionStats()).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.getAllTransactions(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.addNobaAdmin(anything())).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.updateNobaAdmin(anyString(), anything())).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.getNobaAdminByEmail(anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.deleteNobaAdmin(anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminTransactionRepo.getNobaAdminById(anyString())).thenReject(new Error("Not implemented!"));

  return mockAdminTransactionRepo;
};
