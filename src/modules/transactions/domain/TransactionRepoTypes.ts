import { ACHPaymentStatus } from "./Transaction";

export type UpdateFiatTransactionInfoRequest = {
  transactionID: string;

  willUpdateIsApproved: boolean;
  updatedIsApprovedValue?: boolean;

  willUpdateIsFailed: boolean;
  updatedIsFailedValue?: boolean;

  willUpdateIsCompleted: boolean;
  updatedIsCompletedValue?: boolean;

  details: string;
};
