import { anyString, mock, when } from "ts-mockito";
import { PartnerAuthService } from "../partner.auth.service";

export const getMockPartnerAuthServiceWithDefaults = () => {
  const mockPartnerAuthService: PartnerAuthService = mock(PartnerAuthService);

  when(mockPartnerAuthService.validateAndGetUserId(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.generateAccessToken(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.saveOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.sendOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.createOtp()).thenReject(new Error("Not implemented!"));

  return mockPartnerAuthService;
};