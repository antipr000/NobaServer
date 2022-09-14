import { mock, when } from "ts-mockito";
import { ConfigurationProviderService } from "../configuration.provider.service";

export const getMockConfigurationProviderServiceWithDefaults = () => {
  const mockConfigurationProviderService: ConfigurationProviderService = mock(ConfigurationProviderService);

  when(mockConfigurationProviderService.getConfigurations()).thenReject(new Error("Not implemented!"));

  return mockConfigurationProviderService;
};
