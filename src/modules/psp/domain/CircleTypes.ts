import { TransferStatusEnum } from "@circle-fin/circle-sdk/dist/generated/models/transfer";

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
  FAILURE = "FAILURE",
}

export const CircleWithdrawalStatusMap = {
  [TransferStatusEnum.Complete]: CircleWithdrawalStatus.SUCCESS,
  [TransferStatusEnum.Pending]: CircleWithdrawalStatus.PENDING,
  [TransferStatusEnum.Failed]: CircleWithdrawalStatus.FAILURE,
};
