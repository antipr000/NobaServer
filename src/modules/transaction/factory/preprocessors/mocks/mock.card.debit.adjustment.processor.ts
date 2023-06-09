import { anything, mock, when } from "ts-mockito";
import { CardDebitAdjustmentProcessor } from "../implementations/card.debit.adjustment.processor";

export function getMockCardDebitAdjustmentPreprocessorWithDefaults(): CardDebitAdjustmentProcessor {
  const cardDebitAdjustmentPreprocessor = mock(CardDebitAdjustmentProcessor);

  when(cardDebitAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardDebitAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return cardDebitAdjustmentPreprocessor;
}
