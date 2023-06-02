import { anything, mock, when } from "ts-mockito";
import { DebitAdjustmentPreprocessor } from "../implementations/debit.adjustment.preprocessor";

export function getMockDebitAdjustmentPreprocessorWithDefaults(): DebitAdjustmentPreprocessor {
  const debitAdjustmentPreprocessor = mock(DebitAdjustmentPreprocessor);

  when(debitAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(debitAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return debitAdjustmentPreprocessor;
}
