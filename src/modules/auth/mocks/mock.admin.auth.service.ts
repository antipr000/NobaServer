import { anyString, mock, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";

export const getMockAdminAuthServiceWithDefaults = () => {
  const mockAdminAuthService: AdminAuthService = mock(AdminAuthService);

  when(mockAdminAuthService.validateAndGetUserId(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.generateAccessToken(anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.saveOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.sendOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.createOtp()).thenReject(new Error("Not implemented!"));

  return mockAdminAuthService;
};
