import { anyString, anything, mock, when } from "ts-mockito";
import { SQLTransactionRepo } from "../repo/sql.transaction.repo";
import { ITransactionRepo } from "../repo/transaction.repo";

export function getMockTransactionRepoWithDefaults(): ITransactionRepo {
  const mockTransactionRepo: ITransactionRepo = mock(SQLTransactionRepo);

  when(mockTransactionRepo.createTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getTransactionByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getTransactionByTransactionRef(anyString())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getTransactionsByConsumerID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.updateTransactionByTransactionID(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockTransactionRepo.getFilteredTransactions(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.addTransactionEvent(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getTransactionEvents(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  return mockTransactionRepo;
}
