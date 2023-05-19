import { CircleTransferStatus } from "./CircleTypes";

export type UpdateWalletBalanceServiceDTO = {
  id: string;
  status: CircleTransferStatus;
  createdAt: string;
};
