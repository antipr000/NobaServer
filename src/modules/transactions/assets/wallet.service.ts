import { ConsumerAccountBalance } from "../domain/AssetTypes";

export interface WalletService {
  getConsumerAccountBalance(participantID: string): Promise<ConsumerAccountBalance[]>;
}
