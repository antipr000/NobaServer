import { WalletStatus } from "./VerificationStatus";

export type CryptoWallets = {
  walletName?: string;
  address: string;
  chainType?: string;
  isEVMCompatible: boolean;
  status: WalletStatus;
};
