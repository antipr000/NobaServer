export interface ExecutedQuote {
  quoteId: string;
  tradePrice: number;
  cryptoReceived: number;
}

export interface ZerohashTransfer {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: ZerohashTransferStatus,
  asset: string;
  movementId: string;
}

export enum ZerohashTransferStatus {
  PENDING = "pending",
  APPROVED = "approved",
  CANCELLED = "canceled",
  REJECTED = "rejected",
  SETTLED = "settled",
}

export interface ZerohashTradeRquest {
  idempotencyId: string;
  requestorEmail: string;

  buyerParticipantCode: string;
  sellerParticipantCode: string;

  tradePrice: number;
  tradeAmount: number;
  broughtAssetId: string;
  soldAssetId: string;
}

export interface ZerohashTradeResponse {
  tradeId: string;
}

export interface ZerohashTradeResponse {
  tradeId: string;
  settledTimestamp?: number;
  tradeState?: TradeState;
  errorMessage?: string;
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
  onChainTransactionId: string;
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