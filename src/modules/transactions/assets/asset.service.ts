import {
  ConsumerAccountTransferStatus,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityRequest,
  FundsAvailabilityResponse,
  FundsAvailabilityStatus,
  ConsumerWalletTransferStatus,
  NobaQuote,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
} from "../domain/AssetTypes";

export interface AssetService {
  getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote>;
  getQuoteByForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote>;

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse>;
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus>;

  transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string>;
  pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus>;

  transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<string>;
  pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus>;
}
