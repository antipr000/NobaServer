import { anyString, anything, mock, when } from "ts-mockito";
import { WalletWithdrawalImpl } from "../factory/wallet.withdrawal.impl";

export function getMockWalletWithdrawalImplWithDefaults(): WalletWithdrawalImpl {
  const walletWithdrawalImpl = mock(WalletWithdrawalImpl);
  when(walletWithdrawalImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(walletWithdrawalImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  return walletWithdrawalImpl;
}
