import { anyString, anything, mock, when } from "ts-mockito";
import { WalletProviderService } from "../assets/wallet.provider.service";
import { ZerohashAssetService } from "../assets/zerohash.asset.service";

export function getMockWalletProviderServiceWithDefaults(): WalletProviderService {
  const mockWalletProviderService = mock(ZerohashAssetService);

  when(mockWalletProviderService.getConsumerAccountBalance(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockWalletProviderService.transferAssetToNobaAccount(anything())).thenReject(
    new Error("Method not implemented"),
  );
  return mockWalletProviderService;
}
