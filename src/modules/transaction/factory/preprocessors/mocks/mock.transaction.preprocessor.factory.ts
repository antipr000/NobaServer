import { anything, mock, when } from "ts-mockito";
import { TransactionProcessorFactory } from "../transaction.processor.factory";

export function getMockTransactionPreprocessorFactoryWithDefaults(): TransactionProcessorFactory {
  const transactionPreprocessorFactory = mock(TransactionProcessorFactory);

  when(transactionPreprocessorFactory.getPreprocessor(anything())).thenReject(new Error("Not implemented!"));
  when(transactionPreprocessorFactory.extractTransactionProcessorRequest(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return transactionPreprocessorFactory;
}
