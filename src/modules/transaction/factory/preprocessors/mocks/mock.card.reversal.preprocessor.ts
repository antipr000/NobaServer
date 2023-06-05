import { anything, mock, when } from "ts-mockito";
import { CardReversalPreprocessor } from "../implementations/card.reversal.preprocessor";

export function getMockCardReversalPreprocessorWithDefaults(): CardReversalPreprocessor {
  const cardReversalPreprocessor = mock(CardReversalPreprocessor);

  when(cardReversalPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardReversalPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return cardReversalPreprocessor;
}
