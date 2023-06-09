import { anything, mock, when } from "ts-mockito";
import { CardWithdrawalProcessor } from "../implementations/card.withdrawal.processor";

export function getMockCardWithdrawalPreprocessorWithDefaults(): CardWithdrawalProcessor {
  const cardWithdrawalPreprocessor = mock(CardWithdrawalProcessor);

  when(cardWithdrawalPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardWithdrawalPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  when(cardWithdrawalPreprocessor.performPostProcessing(anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );

  return cardWithdrawalPreprocessor;
}
