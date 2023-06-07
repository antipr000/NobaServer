import { anything, mock, when } from "ts-mockito";
import { CardWithdrawalPreprocessor } from "../implementations/card.withdrawal.preprocessro";

export function getMockCardWithdrawalPreprocessorWithDefaults(): CardWithdrawalPreprocessor {
  const cardWithdrawalPreprocessor = mock(CardWithdrawalPreprocessor);

  when(cardWithdrawalPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(cardWithdrawalPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return cardWithdrawalPreprocessor;
}
