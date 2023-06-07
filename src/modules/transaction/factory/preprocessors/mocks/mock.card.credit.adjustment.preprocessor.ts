import { anything, mock, when } from "ts-mockito";
import { CardCreditAdjustmentPreprocessor } from "../implementations/card.credit.adjustment.preprocessor";

export function getMockCardCreditAdjustmentPreprocessorWithDefaults(): CardCreditAdjustmentPreprocessor {
  const cardCreditAdjustmentPreprocessor = mock(CardCreditAdjustmentPreprocessor);

  when(cardCreditAdjustmentPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardCreditAdjustmentPreprocessor.convertToRepoInputTransaction(anything())).thenReject(
    new Error("Not implemented!"),
  );
  return cardCreditAdjustmentPreprocessor;
}
