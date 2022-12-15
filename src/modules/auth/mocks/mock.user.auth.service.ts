import { anyNumber, anyString, mock, when } from "ts-mockito";
import { UserAuthService } from "../user.auth.service";

export const getMockUserAuthServiceWithDefaults = () => {
  const mockUserAuthService: UserAuthService = mock(UserAuthService);

  when(mockUserAuthService.validateAndGetUserId(anyString(), anyNumber())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.generateAccessToken(anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.saveOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.sendOtp(anyString(), anyString())).thenReject(new Error("Send Otp not implemented!"));
  when(mockUserAuthService.generateOTP()).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.verifyUserExistence(anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.validateToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.invalidateToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockUserAuthService;
};
