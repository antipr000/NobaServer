import { anything, mock, when } from "ts-mockito";
import { WalletDepositProcessor } from "../implementations/wallet.deposit.processor";

export function getMockWalletDepositProcessorWithDefaults(): WalletDepositProcessor {
  const walletDepositProcessor = mock(WalletDepositProcessor);

  when(walletDepositProcessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(walletDepositProcessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  when(walletDepositProcessor.getQuote(anything(), anything(), anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );
  when(walletDepositProcessor.initiateWorkflow(anything(), anything())).thenReject(new Error("Not implemented!"));

  return walletDepositProcessor;
}
