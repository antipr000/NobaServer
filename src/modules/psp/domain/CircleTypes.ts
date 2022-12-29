export interface CircleWithdrawalRequest {
  idempotencyKey: string;
  amount: number;
  sourceWalletID: string;
  destinationWalletID: string;
}

export interface CircleWithdrawalResponse {
  status: CircleWithdrawalStatus;
  currentBalance: number;
  updatedBalance: number;
}

export enum CircleWithdrawalStatus {
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR", // safe to retry with the same 'idempotencyKey'.
}
