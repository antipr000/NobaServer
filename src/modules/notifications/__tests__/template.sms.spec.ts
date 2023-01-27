import { smsTemplates } from "../sms/templates.sms";

describe("SMSTemplatesTest", () => {
  it("should return proper message for send otp", async () => {
    expect(smsTemplates["template_send_otp"]({ otp: "123456" })).toBe(
      "123456 is your one-time password for Noba login.",
    );
  });

  it("should return proper message for phone verification", async () => {
    expect(smsTemplates["template_send_phone_verification_code"]({ otp: "123456" })).toBe(
      "123456 is your one-time password to verify your phone number with Noba.",
    );
  });

  it("should return proper message for wallet update verification code", async () => {
    expect(smsTemplates["template_send_wallet_verification_code"]({ otp: "123456" })).toBe(
      "123456 is your wallet verification code",
    );
  });
});
