export interface CircleWithdrawalRequest {
  idempotencyKey: string;
  amountToWithdraw: number;
  sourceWalletID: string;
}

export interface CircleWithdrawalResponse {
  status: CircleWithdrawalStatus;
  currentBalance: number;
  balanceAfterWithdrawal: number;
}

export enum CircleWithdrawalStatus {
  SUCCESS = "SUCCESS",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR", // safe to retry with the same 'idempotencyKey'.
}
