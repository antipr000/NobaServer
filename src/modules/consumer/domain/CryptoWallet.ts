import { WalletStatus } from "@prisma/client";

export type CryptoWallet = {
  walletName?: string;
  address: string;
  chainType?: string;
  isEVMCompatible?: boolean;
  status: WalletStatus;
  riskScore?: number;
};
