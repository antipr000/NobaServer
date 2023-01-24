import { anyString, anything, mock, when } from "ts-mockito";
import { WalletDepositImpl } from "../factory/wallet.deposit.impl";

export function getMockWalletDepositImplWithDefaults(): WalletDepositImpl {
  const walletDepositImpl = mock(WalletDepositImpl);
  when(walletDepositImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(walletDepositImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  return walletDepositImpl;
}
