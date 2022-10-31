import { WalletStatus } from "../../../modules/consumer/domain/VerificationStatus";

export type TransactionInformation = {
  transactionID: string;
  amount?: number;
  currencyCode?: string;
  paymentMethodID?: string;
  cryptoCurrencyCode?: string;
  walletAddress?: string;
  walletStatus?: WalletStatus;
  partnerName: string;
};
