import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";

export const getMockAdminAuthServiceWithDefaults = () => {
  const mockAdminAuthService: AdminAuthService = mock(AdminAuthService);

  when(mockAdminAuthService.validateAndGetUserId(anyString(), anyNumber())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.generateAccessToken(anyString(), anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockAdminAuthService.saveOtp(anyString(), anyString())).thenReject(
    new Error("Save OTP method not implemented!"),
  );
  when(mockAdminAuthService.sendOtp(anyString(), anyString())).thenReject(
    new Error("Send OTP method not implemented!"),
  );
  when(mockAdminAuthService.generateOTP(anyString())).thenReject(new Error("Not implemented!"));
  when(mockAdminAuthService.verifyUserExistence(anyString())).thenReject(new Error("Not implemented!"));

  return mockAdminAuthService;
};
