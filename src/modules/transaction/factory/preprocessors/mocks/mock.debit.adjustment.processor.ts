import { anything, mock, when } from "ts-mockito";
import { DebitAdjustmentProcessor } from "../implementations/debit.adjustment.processor";

export function getMockDebitAdjustmentPreprocessorWithDefaults(): DebitAdjustmentProcessor {
  const debitAdjustmentPreprocessor = mock(DebitAdjustmentProcessor);

  when(debitAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(debitAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return debitAdjustmentPreprocessor;
}
