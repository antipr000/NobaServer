import { anything, mock, when } from "ts-mockito";
import { MongoDBTransactionRepo } from "../repo/MongoDBTransactionRepo";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";

export function getMockTransactionRepoWithDefaults(): ITransactionRepo {
  const mockTransactionRepo = mock(MongoDBTransactionRepo);

  when(mockTransactionRepo.getAll()).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.createTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.updateTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getUserTransactions(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getUserTransactionInAnInterval(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockTransactionRepo.getTotalUserTransactionAmount(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getMonthlyUserTransactionAmount(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getWeeklyUserTransactionAmount(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionRepo.getDailyUserTransactionAmount(anything())).thenReject(new Error("Method not implemented"));

  return mockTransactionRepo;
}

export function getMockTransactionServiceWithDefaults(): TransactionService {
  const mockTransactionService = mock(TransactionService);

  when(mockTransactionService.getTransactionQuote(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionService.getTransactionStatus(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionService.getUserTransactions(anything())).thenReject(new Error("Method not implemented"));
  when(mockTransactionService.getTransactionsInInterval(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockTransactionService.getAllTransactions()).thenReject(new Error("Method not implemented"));
  when(mockTransactionService.initiateTransaction(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  return mockTransactionService;
}
