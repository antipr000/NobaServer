import { anything, mock, when } from "ts-mockito";
import { WalletTransferProcessor } from "../implementations/wallet.transfer.processor";

export function getMockwalletTransferPreprocessorWithDefaults(): WalletTransferProcessor {
  const walletTransferPreprocessor = mock(WalletTransferProcessor);

  when(walletTransferPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(walletTransferPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  when(walletTransferPreprocessor.initiateWorkflow(anything(), anything())).thenReject(new Error("Not implemented!"));
  return walletTransferPreprocessor;
}
