import {
  ConsumerAccountTransferStatus,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  ExecuteQuoteRequest,
  FundsAvailabilityResponse,
  FundsAvailabilityStatus,
  ConsumerWalletTransferStatus,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
  ExecutedQuote,
  FundsAvailabilityRequest,
  ExecutedQuoteStatus,
  ConsumerWalletTransferResponse,
  CombinedNobaQuote,
} from "../domain/AssetTypes";

export interface AssetService {
  getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<CombinedNobaQuote>;
  getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<CombinedNobaQuote>;

  executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote>;
  pollExecuteQuoteForFundsAvailabilityStatus(id: string): Promise<ExecutedQuoteStatus>;

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse>;
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus>;

  transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string>;
  pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus>;

  transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<ConsumerWalletTransferResponse>;
  pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus>;

  getIntermediaryLeg(): string;
  needsIntermediaryLeg(): boolean;
}
