import { ConsumerAccountBalance, ConsumerAccountTransferRequest } from "../domain/AssetTypes";

export interface WalletProviderService {
  getConsumerAccountBalance(participantID: string, asset?: string): Promise<ConsumerAccountBalance[]>;
  transferAssetToNobaAccount(request: ConsumerAccountTransferRequest): Promise<string>;
}
