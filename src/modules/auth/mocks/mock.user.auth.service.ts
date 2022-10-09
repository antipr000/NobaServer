import { anyNumber, anyString, mock, when } from "ts-mockito";
import { UserAuthService } from "../user.auth.service";

export const getMockUserAuthServiceWithDefaults = () => {
  const mockUserAuthService: UserAuthService = mock(UserAuthService);

  when(mockUserAuthService.validateAndGetUserId(anyString(), anyNumber(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockUserAuthService.generateAccessToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.saveOtp(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.sendOtp(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.createOtp()).thenReject(new Error("Not implemented!"));
  when(mockUserAuthService.verifyUserExistence(anyString())).thenReject(new Error("Not implemented!"));

  return mockUserAuthService;
};
