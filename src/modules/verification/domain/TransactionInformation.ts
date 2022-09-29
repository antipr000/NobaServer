import { WalletStatus } from "../../../modules/consumer/domain/VerificationStatus";

export type TransactionInformation = {
  transactionID: string;
  amount?: number;
  currencyCode?: string;
  first6DigitsOfCard?: string;
  last4DigitsOfCard?: string;
  cardID?: string;
  cryptoCurrencyCode?: string;
  walletAddress?: string;
  walletStatus?: WalletStatus;
  partnerName: string;
};
