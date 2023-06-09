import { anything, mock, when } from "ts-mockito";
import { CardCreditAdjustmentProcessor } from "../implementations/card.credit.adjustment.processor";

export function getMockCardCreditAdjustmentPreprocessorWithDefaults(): CardCreditAdjustmentProcessor {
  const cardCreditAdjustmentPreprocessor = mock(CardCreditAdjustmentProcessor);

  when(cardCreditAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardCreditAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  when(cardCreditAdjustmentPreprocessor.performPostProcessing(anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );
  return cardCreditAdjustmentPreprocessor;
}
