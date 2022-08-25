import { Injectable } from "@nestjs/common";
import {
  FundsAvailabilityRequest,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityStatus,
  FundsAvailabilityResponse,
  ConsumerWalletTransferStatus,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
  NobaQuote,
  ConsumerAccountTransferStatus,
} from "../domain/AssetTypes";
import { AssetService } from "./asset.service";

@Injectable()
export class USDCPolygonAssetService implements AssetService {
  getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote> {
    throw new Error("Method not implemented.");
  }
  getQuoteByForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote> {
    throw new Error("Method not implemented.");
  }

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    throw new Error("Method not implemented.");
  }
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus> {
    throw new Error("Method not implemented.");
  }

  transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string> {
    throw new Error("Method not implemented.");
  }
  pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus> {
    throw new Error("Method not implemented.");
  }

  transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<string> {
    throw new Error("Method not implemented.");
  }
  pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus> {
    throw new Error("Method not implemented.");
  }
}
