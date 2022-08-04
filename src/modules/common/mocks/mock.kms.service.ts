import { mock, when, anything } from "ts-mockito";
import { KmsService } from "../kms.service";

export const getMockKmsServiceWithDefaults = () => {
  const mockKmsService: KmsService = mock(KmsService);

  when(mockKmsService.encryptString(anything(), anything())).thenReject(new Error("Not implemented!"));
  when(mockKmsService.decryptString(anything(), anything())).thenReject(new Error("Not implemented!"));

  return mockKmsService;
};
