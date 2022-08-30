import { ConsumerProps } from "../../consumer/domain/Consumer";

export enum PollStatus {
  SUCCESS = "success",
  PENDING = "pending",
  FAILURE = "failed",
  FATAL_ERROR = "internal_error",
}

export interface ExecutedQuote {
  quoteID: string;
  tradePrice: number;
  cryptoReceived: number;
  cryptocurrency: string;
  tradeID: string;
}

export interface ExecuteQuoteRequest {
  fiatAmount: number;
  fiatCurrency: string;

  cryptoQuantity: number;
  cryptoCurrency: string;

  slippage: number;

  transactionID: string;
  transactionCreationTimestamp: Date;

  consumer: ConsumerProps;
}

export interface FundsAvailabilityRequest {
  cryptocurrency: string;
  cryptoAmount: number;
}

export interface FundsAvailabilityResponse {
  transferID: string;
  transferredCrypto: number;
  cryptocurrency: string;
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
  totalFiatAmount: number;
  fiatAmountPreSpread: number;

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
  amountPreSpread: number; // Amount in fiat before spread calculation
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
