import { anything, mock, when } from "ts-mockito";
import { CreditAdjustmentPreprocessor } from "../implementations/credit.adjustment.preprocessor";

export function getMockCreditAdjustmentPreprocessorWithDefaults(): CreditAdjustmentPreprocessor {
  const creditAdjustmentPreprocessor = mock(CreditAdjustmentPreprocessor);

  when(creditAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(creditAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return creditAdjustmentPreprocessor;
}
