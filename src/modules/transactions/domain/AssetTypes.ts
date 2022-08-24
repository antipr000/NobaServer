import { ConsumerProps } from "../../consumer/domain/Consumer";

export enum PollStatus {
  SUCCESS = "success",
  PENDING = "pending",
  FAILURE = "failed",
  FATAL_ERROR = "internal_error",
}

export interface FundsAvailabilityRequest {
  fiatAmount: number;
  fiatCurrency: string;

  cryptoQuantity: number;
  cryptoCurrency: string;

  slippage: number;

  transactionID: string;
  transactionCreationTimestamp: Date;

  consumer: ConsumerProps;
}

export interface FundsAvailabilityResponse {
  id: string;
  tradePrice: number;
}

export interface FundsAvailabilityStatus {
  status: PollStatus;
  errorMessage: string;
  settledId: string;
}

export interface ConsumerAccountTransferRequest {
  consumer: ConsumerProps;

  cryptoCurrency: string;
  fiatCurrency: string;

  cryptoAssetTradePrice: number;
  totalCryptoAmount: number;

  transactionID: string;
  transactionCreationTimestamp: Date;
}

export interface ConsumerAccountTransferStatus {
  status: PollStatus;
  errorMessage: string;
}

export interface ConsumerWalletTransferRequest {
  walletAddress: string;
  amount: number;
  assetId: string;
  consumer: ConsumerProps;
  transactionID: string;
}

export interface ConsumerWalletTransferStatus {
  status: PollStatus;
  errorMessage: string;

  requestedAmount: number;
  settledAmount: number;
  onChainTransactionID: string;
}

export interface NobaQuote {
  quoteID: string;
  fiatCurrency: string;
  cryptoCurrency: string;

  processingFeeInFiat: number;
  networkFeeInFiat: number;
  nobaFeeInFiat: number;

  totalFiatAmount: number;
  totalCryptoQuantity: number;
  perUnitCryptoPrice: number;
}

export interface QuoteRequestForFixedFiat {
  cryptoCurrency: string;
  fiatCurrency: string;
  fiatAmount: number;
}

export interface QuoteRequestForFixedCrypto {
  cryptoCurrency: string;
  fiatCurrency: string;
  cryptoQuantity: number;
}
