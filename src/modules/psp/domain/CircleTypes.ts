export type TransferRequest = {
  idempotencyKey: string;
  amount: number;
  sourceWalletID: string;
  destinationWalletID: string;
};

export type TransferResponse = {
  transferID: string;
  amount: number;
  sourceWalletID: string;
  destinationWalletID: string;
  status: CircleTransferStatus;
  createdAt: string;
};

export enum CircleTransferStatus {
  SUCCESS = "SUCCESS",
  TRANSFER_FAILED = "TRANSFER_FAILED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
}
