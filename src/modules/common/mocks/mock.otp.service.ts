import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { OTPService } from "../otp.service";

export function getMockOTPServiceWithDefaults() {
  const otpService = mock(OTPService);
  when(otpService.checkIfOTPIsValidAndCleanup(anyString(), anything(), anyNumber())).thenReject(
    new Error("Method not implemented!"),
  );
  when(otpService.saveOTP(anyString(), anything(), anyNumber())).thenReject(new Error("Not implemented!"));
  return otpService;
}
