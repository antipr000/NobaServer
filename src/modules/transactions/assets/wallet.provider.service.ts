import { ConsumerAccountBalance } from "../domain/AssetTypes";

export interface WalletProviderService {
  getConsumerAccountBalance(participantID: string): Promise<ConsumerAccountBalance[]>;
}
