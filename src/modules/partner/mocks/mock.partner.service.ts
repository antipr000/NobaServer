import { anyString, anything, mock, when } from "ts-mockito";
import { PartnerService } from "../partner.service";

export const getMockPartnerServiceWithDefaults = () => {
  const mockPartnerService: PartnerService = mock(PartnerService);

  when(mockPartnerService.createPartner(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerService.getPartner(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerService.getPartnerFromApiKey(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerService.updatePartner(anyString(), anything())).thenReject(new Error("Not implemented!"));

  return mockPartnerService;
};
