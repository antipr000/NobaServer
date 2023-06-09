import { anything, mock, when } from "ts-mockito";
import { WalletWithdrawalProcessor } from "../implementations/wallet.withdrawal.processor";

export function getMockWalletWithdrawalProcessorWithDefaults(): WalletWithdrawalProcessor {
  const walletWithdrawalProcessor = mock(WalletWithdrawalProcessor);

  when(walletWithdrawalProcessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(walletWithdrawalProcessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  when(walletWithdrawalProcessor.getQuote(anything(), anything(), anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );
  when(walletWithdrawalProcessor.initiateWorkflow(anything(), anything())).thenReject(new Error("Not implemented!"));
  return walletWithdrawalProcessor;
}
