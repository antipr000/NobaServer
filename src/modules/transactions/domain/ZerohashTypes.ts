export interface ExecutedQuote {
  quoteID: string;
  tradePrice: number;
  cryptoReceived: number;
}

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

export interface ZerohashTradeRquest {
  idempotencyID: string;
  requestorEmail: string;

  buyerParticipantCode: string;
  sellerParticipantCode: string;

  tradePrice: number;
  tradeAmount: number;
  boughtAssetID: string;
  soldAssetId: string;
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
