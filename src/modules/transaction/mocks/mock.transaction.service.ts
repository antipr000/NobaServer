import { anyString, anything, mock, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";

export function getMockTransactionServiceWithDefaults(): TransactionService {
  const mockTransactionService: TransactionService = mock(TransactionService);

  when(mockTransactionService.getTransactionByTransactionRef(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockTransactionService.initiateTransaction(anything(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockTransactionService.getFilteredTransactions(anything())).thenReject(new Error("Method not implemented"));

  when(mockTransactionService.addTransactionEvent(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockTransactionService.getTransactionEvents(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockTransactionService.updateTransaction(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  return mockTransactionService;
}
