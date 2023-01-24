import { anyString, anything, mock, when } from "ts-mockito";
import { WalletTransferImpl } from "../factory/wallet.transfer.impl";

export function getMockWalletTransferImplWithDefaults(): WalletTransferImpl {
  const walletTransferImpl = mock(WalletTransferImpl);
  when(walletTransferImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(walletTransferImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  return walletTransferImpl;
}
