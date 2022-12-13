import { Consumer } from "./consumer";
import { WalletStatus } from "@prisma/client";

export class CryptoWallet {
  id: number;

  address: string;

  name: string;

  chainType?: string;

  isEVMCompatible?: boolean;

  status: WalletStatus = WalletStatus.PENDING;

  riskScore?: number;

  consumer: Consumer;

  consumerID: string;
}
