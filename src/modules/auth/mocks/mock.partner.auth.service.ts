import { anyNumber, anyString, mock, when } from "ts-mockito";
import { PartnerAuthService } from "../partner.auth.service";

export const getMockPartnerAuthServiceWithDefaults = () => {
  const mockPartnerAuthService: PartnerAuthService = mock(PartnerAuthService);

  when(mockPartnerAuthService.validateAndGetUserId(anyString(), anyNumber(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockPartnerAuthService.generateAccessToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.saveOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.sendOtp(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.generateOTP()).thenReject(new Error("Not implemented!"));
  when(mockPartnerAuthService.verifyUserExistence(anyString())).thenReject(new Error("Not implemented!"));

  return mockPartnerAuthService;
};
