import { anyString, mock, when } from "ts-mockito";
import { CardProviderFactory } from "../providers/card.provider.factory";

export function getMockCardProviderFactoryWithDefaults(): CardProviderFactory {
  const mockCardProviderFactory = mock(CardProviderFactory);

  when(mockCardProviderFactory.getCardProviderService(anyString())).thenThrow(new Error("Not implemented!"));

  return mockCardProviderFactory;
}
