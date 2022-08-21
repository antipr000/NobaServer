import { ConsumerAccountTransferStatus, ConsumerAccountTransferRequest, ConsumerWalletTransferRequest, FundsAvailabilityRequest, FundsAvailabilityResponse, FundsAvailabilityStatus } from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";

export interface AssetService {
  getQuote(quoteQuery: TransactionQuoteQueryDTO);

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse>;
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus>;

  transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string>;
  pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus>;

  transferToConsumerWallet(request: ConsumerWalletTransferRequest);
  pollConsumerWalletTransferStatus(id: string);
}