import { anything, mock, when } from "ts-mockito";
import { CreditAdjustmentProcessor } from "../implementations/credit.adjustment.processor";

export function getMockCreditAdjustmentPreprocessorWithDefaults(): CreditAdjustmentProcessor {
  const creditAdjustmentPreprocessor = mock(CreditAdjustmentProcessor);

  when(creditAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(creditAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  when(creditAdjustmentPreprocessor.performPostProcessing(anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );

  return creditAdjustmentPreprocessor;
}
