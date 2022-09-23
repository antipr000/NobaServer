import {
  QuoteRequestForFixedCrypto,
  NobaQuote,
  ConsumerWalletTransferRequest,
  QuoteRequestForFixedFiat,
  ExecuteQuoteRequest,
  ExecutedQuote,
  FundsAvailabilityRequest,
  FundsAvailabilityResponse,
  ConsumerAccountTransferRequest,
  ExecutedQuoteStatus,
  FundsAvailabilityStatus,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferResponse,
  ConsumerWalletTransferStatus,
} from "../domain/AssetTypes";
import { AssetService } from "./asset.service";
import { RouteResponse } from "../domain/SwapServiceProviderTypes";
import { SwapServiceProvider } from "../domain/swap.service.provider";

// TODO(#594): Rename class to something proper
export class SwapAssetService implements AssetService {
  constructor(private readonly swapServiceProvider: SwapServiceProvider, private readonly assetService: AssetService) {}

  async getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote> {
    const intermediaryQuoteRequest: QuoteRequestForFixedFiat = {
      cryptoCurrency: request.intermediateCryptoCurrency,
      fiatCurrency: request.fiatCurrency,
      fiatAmount: request.fiatAmount,
    };

    const intermediaryQuoteResponse: NobaQuote = await this.assetService.getQuoteForSpecifiedFiatAmount(
      intermediaryQuoteRequest,
    );

    const routeResponse: RouteResponse = await this.swapServiceProvider.performRouting(
      request.cryptoCurrency,
      intermediaryQuoteResponse.totalCryptoQuantity,
    );

    // Find the proper calculations
    return {
      ...intermediaryQuoteResponse,
      totalCryptoQuantity: routeResponse.assetQuantity,
    };
  }

  async getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote> {
    throw new Error(`Fixed side crypto is not supported for ${request.cryptoCurrency}`);
  }

  async executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote> {
    return this.assetService.executeQuoteForFundsAvailability(request);
  }

  async pollExecuteQuoteForFundsAvailabilityStatus(id: string): Promise<ExecutedQuoteStatus> {
    return this.assetService.pollExecuteQuoteForFundsAvailabilityStatus(id);
  }

  async makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    return this.assetService.makeFundsAvailable(request);
  }

  async pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus> {
    return this.assetService.pollFundsAvailableStatus(id);
  }

  async transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string> {
    return this.assetService.transferAssetToConsumerAccount(request);
  }

  async pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus> {
    return this.assetService.pollAssetTransferToConsumerStatus(id);
  }

  async transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<ConsumerWalletTransferResponse> {
    // First get the smart contract details for final transfer
    const routeResponse: RouteResponse = await this.swapServiceProvider.performRouting(
      request.assetId,
      request.amount,
      request.walletAddress,
    );

    const withdrawalResponse = await this.assetService.transferToConsumerWallet({
      ...request,
      assetId: this.swapServiceProvider.getIntermediaryLeg(),
      smartContractData: routeResponse.smartContractData,
    });

    return {
      liquidityProviderTransactionId: withdrawalResponse.liquidityProviderTransactionId,
      cryptoAmount: routeResponse.assetQuantity,
    };
  }

  async pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus> {
    return this.assetService.pollConsumerWalletTransferStatus(id);
  }

  getIntermediaryLeg(): string {
    return this.swapServiceProvider.getIntermediaryLeg();
  }

  needsIntermediaryLeg(): boolean {
    return true;
  }
}
