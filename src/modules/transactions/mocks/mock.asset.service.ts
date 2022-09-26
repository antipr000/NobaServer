import { anyString, anything, mock, when } from "ts-mockito";
import { AssetService } from "../assets/asset.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { ZerohashAssetService } from "../assets/zerohash.asset.service";

export function getMockAssetServiceWithDefaults(): AssetService {
  const mockAssetService = mock(ZerohashAssetService);

  when(mockAssetService.getQuoteForSpecifiedCryptoQuantity(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.getQuoteForSpecifiedFiatAmount(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.executeQuoteForFundsAvailability(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.makeFundsAvailable(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.pollAssetTransferToConsumerStatus(anyString())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.pollConsumerWalletTransferStatus(anyString())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.pollFundsAvailableStatus(anyString())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.transferAssetToConsumerAccount(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.transferToConsumerWallet(anything())).thenReject(new Error("Method not implemented"));
  when(mockAssetService.needsIntermediaryLeg()).thenReturn(false);
  return mockAssetService;
}

export function getMockAssetServiceFactoryWithDefaultAssetService(): AssetServiceFactory {
  const mockAssetServiceFactory = mock(AssetServiceFactory);
  when(mockAssetServiceFactory.getAssetService(anyString())).thenReject(new Error("Method not implemented!"));
  return mockAssetServiceFactory;
}
