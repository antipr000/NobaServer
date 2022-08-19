import { ConsumerAccountTransferRequest, ConsumerWalletTransferRequest, FundsAvailabilityRequest } from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";

export interface AssetService {
  getQuote(quoteQuery: TransactionQuoteQueryDTO);

  makeFundsAvailable(request: FundsAvailabilityRequest);
  pollFundsAvailableStatus(id: string);

  transferToConsumerAccount(request: ConsumerAccountTransferRequest);
  pollAccountTransferStatus(id: string);

  transferToConsumerWallet(request: ConsumerWalletTransferRequest);
  pollConsumerWalletTransferStatus(id: string);
}