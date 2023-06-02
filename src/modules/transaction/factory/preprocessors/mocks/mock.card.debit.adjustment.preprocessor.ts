import { anything, mock, when } from "ts-mockito";
import { CardDebitAdjustmentPreprocessor } from "../implementations/card.debit.adjustment.preprocessor";

export function getMockCardDebitAdjustmentPreprocessorWithDefaults(): CardDebitAdjustmentPreprocessor {
  const cardDebitAdjustmentPreprocessor = mock(CardDebitAdjustmentPreprocessor);

  when(cardDebitAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardDebitAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return cardDebitAdjustmentPreprocessor;
}
