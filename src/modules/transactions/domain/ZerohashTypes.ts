export interface ZerohashTransfer {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: ZerohashTransferStatus;
  asset: string;
  movementID: string;
}

export enum ZerohashTransferStatus {
  PENDING = "pending",
  APPROVED = "approved",
  CANCELLED = "canceled",
  REJECTED = "rejected",
  SETTLED = "settled",
}

export interface ZerohashTradeRequest {
  idempotencyID: string;
  requestorEmail: string;

  buyerParticipantCode: string;
  sellerParticipantCode: string;

  tradePrice: number;
  buyAmount: number;
  boughtAssetID: string;
  sellAmount: number;
  totalFiatAmount: number;
  soldAssetID: string;
}

export interface ZerohashTradeResponse {
  tradeID: string;
}

export interface ZerohashTradeResponse {
  tradeID: string;
  settledTimestamp?: number;
  tradeState?: TradeState;
  errorMessage?: string;
}

export interface ZerohashTransferResponse {
  transferID: string;
  cryptoAmount: number;
  cryptocurrency: string;
}

export enum TradeState {
  SETTLED = "settled",
  DEFAULTED = "defaulted",
  PENDING = "pending",
}

export interface ZerohashWithdrawalResponse {
  requestedAmount: number;
  settledAmount: number;
  withdrawalStatus: WithdrawalState;
  onChainStatus: OnChainState;
  onChainTransactionID: string;
  gasPrice: string;
}

export enum WithdrawalState {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SETTLED = "settled",
}

export enum OnChainState {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  ERROR = "error",
}

export interface ZerohashQuote {
  quoteID: string;
  expireTimestamp: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  perUnitCryptoAssetCost: number;
}

export interface ZerohashNetworkFee {
  cryptoCurrency: string;
  fiatCurrency: string;

  feeInFiat: number;
  feeInCrypto: number;
}
