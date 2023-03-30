import { anyString, mock, when } from "ts-mockito";
import { IdentificationService } from "../identification.service";

export const getMockIdentificationServiceWithDefaults = () => {
  const mockIdentificationService: IdentificationService = mock(IdentificationService);

  when(mockIdentificationService.getIdentificationTypes()).thenReject(new Error("Not implemented!"));
  when(mockIdentificationService.getIdentificationTypesForCountry(anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockIdentificationService.validateIdentificationType(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );

  return mockIdentificationService;
};
