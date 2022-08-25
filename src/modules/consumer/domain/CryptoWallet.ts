import { WalletStatus } from "./VerificationStatus";

export type CryptoWallet = {
  walletName?: string;
  address: string;
  chainType?: string;
  isEVMCompatible?: boolean;
  status: WalletStatus;
  partnerID?: string;
};
