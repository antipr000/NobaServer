import {
  ConsumerAccountTransferStatus,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  ExecuteQuoteRequest,
  FundsAvailabilityResponse,
  FundsAvailabilityStatus,
  ConsumerWalletTransferStatus,
  NobaQuote,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
  ExecutedQuote,
  FundsAvailabilityRequest,
  ExecutedQuoteStatus,
} from "../domain/AssetTypes";

export interface AssetService {
  getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote>;
  getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote>;

  executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote>;
  pollExecuteQuoteForFundsAvailabilityStatus(id: string): Promise<ExecutedQuoteStatus>;

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse>;
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus>;

  transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string>;
  pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus>;

  transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<string>;
  pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus>;
}
