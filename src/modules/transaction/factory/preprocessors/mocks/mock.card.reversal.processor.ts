import { anything, mock, when } from "ts-mockito";
import { CardReversalProcessor } from "../implementations/card.reversal.processor";

export function getMockCardReversalPreprocessorWithDefaults(): CardReversalProcessor {
  const cardReversalPreprocessor = mock(CardReversalProcessor);

  when(cardReversalPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardReversalPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return cardReversalPreprocessor;
}
