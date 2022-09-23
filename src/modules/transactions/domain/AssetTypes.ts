import { CurrencyType } from "../../../modules/common/domain/Types";
import { ConsumerProps } from "../../consumer/domain/Consumer";

export enum PollStatus {
  SUCCESS = "success",
  PENDING = "pending",
  RETRYABLE_FAILURE = "retryable_failure",
  FAILURE = "failed",
  FATAL_ERROR = "internal_error",
}

export const TRADE_TYPE_FIXED = "FIXED";

export interface ExecutedQuote {
  tradeID: string;
  tradePrice: number;
  cryptoReceived: number;
  quote: NobaQuote;
}

export interface ExecuteQuoteRequest {
  fiatAmount: number;
  fiatCurrency: string;

  cryptoQuantity: number;
  cryptoCurrency: string;

  fixedSide: CurrencyType;
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
  intermediateCryptoAsset?: string;
  smartContractData?: string;
}

export interface ConsumerWalletTransferResponse {
  liquidityProviderTransactionId: string;
  cryptoAmount?: number;
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
  intermediateCryptoCurrency?: string;

  processingFeeInFiat: number;
  amountPreSpread: number; // Amount in fiat before spread calculation
  networkFeeInFiat: number;
  nobaFeeInFiat: number;

  totalFiatAmount: number;
  totalCryptoQuantity: number;
  totalIntermediateCryptoAmount?: number;
  perUnitCryptoPriceWithSpread: number; // Sell rate - this is what the consumer sees
  perUnitCryptoPriceWithoutSpread: number; // Buy rate - this is what Noba pays
}

export interface QuoteRequestForFixedFiat {
  cryptoCurrency: string;
  fiatCurrency: string;
  fiatAmount: number;
  intermediateCryptoCurrency?: string;
}

export interface QuoteRequestForFixedCrypto {
  cryptoCurrency: string;
  fiatCurrency: string;
  cryptoQuantity: number;
}

export interface ExecutedQuoteStatus {
  status: PollStatus;
  errorMessage: string;
  settledTimestamp: number;
}
