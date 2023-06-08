import { anything, mock, when } from "ts-mockito";
import { WalletTransferPreprocessor } from "../implementations/wallet.transfer.preprocessor";

export function getMockwalletTransferPreprocessorWithDefaults(): WalletTransferPreprocessor {
  const walletTransferPreprocessor = mock(WalletTransferPreprocessor);

  when(walletTransferPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(walletTransferPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return walletTransferPreprocessor;
}
