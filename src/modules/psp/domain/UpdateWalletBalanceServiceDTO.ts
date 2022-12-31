import { CircleWithdrawalStatus } from "./CircleTypes";

export type UpdateWalletBalanceServiceDTO = {
  id: string;
  status: CircleWithdrawalStatus;
  createdAt: string;
};
