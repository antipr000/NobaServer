import { anyString, mock, when } from "ts-mockito";
import { HeaderValidationService } from "../header.validation.service";

export function getMockHeaderValidationServiceWithDefaults(): HeaderValidationService {
  const mockHeaderValidationService = mock(HeaderValidationService);
  when(
    mockHeaderValidationService.validateApiKeyAndSignature(
      anyString(),
      anyString(),
      anyString(),
      anyString(),
      anyString(),
      anyString(),
    ),
  ).thenReject(new Error("Method not implemented!"));
  return mockHeaderValidationService;
}
