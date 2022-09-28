import { anyString, mock, when } from "ts-mockito";
import { SanctionedCryptoWalletService } from "../sanctionedcryptowallet.service";

export function getMockSanctionedCryptoWalletServiceWithDefaults(): SanctionedCryptoWalletService {
  const mockSanctionedCryptoWalletService = mock(SanctionedCryptoWalletService);
  when(mockSanctionedCryptoWalletService.isWalletSanctioned(anyString())).thenReject(
    new Error("Method not implemented"),
  );
  return mockSanctionedCryptoWalletService;
}
