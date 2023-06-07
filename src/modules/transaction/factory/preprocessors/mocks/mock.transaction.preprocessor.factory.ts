import { anything, mock, when } from "ts-mockito";
import { TransactionPreprocessorFactory } from "../transaction.preprocessor.factory";

export function getMockTransactionPreprocessorFactoryWithDefaults(): TransactionPreprocessorFactory {
  const transactionPreprocessorFactory = mock(TransactionPreprocessorFactory);

  when(transactionPreprocessorFactory.getPreprocessor(anything())).thenReject(new Error("Not implemented!"));
  when(transactionPreprocessorFactory.extractTransactionPreprocessorRequest(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return transactionPreprocessorFactory;
}
