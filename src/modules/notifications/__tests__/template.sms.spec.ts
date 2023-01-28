import { smsTemplates } from "../sms/templates.sms";

describe("SMSTemplatesTest", () => {
  it("should return proper message for send otp in English", async () => {
    expect(smsTemplates["template_send_otp_en"]({ otp: "123456" })).toBe(
      "123456 is your one-time password for Noba login.",
    );
  });

  it("should return proper message for send otp in Spanish", async () => {
    expect(smsTemplates["template_send_otp_es"]({ otp: "123456" })).toBe(
      "123456 es su contraseña de un solo uso para iniciar sesión en Noba.",
    );
  });

  it("should return proper message for phone verification in English", async () => {
    expect(smsTemplates["template_send_phone_verification_code_en"]({ otp: "123456" })).toBe(
      "123456 is your one-time password to verify your phone number with Noba.",
    );
  });

  it("should return proper message for phone verification in Spanish", async () => {
    expect(smsTemplates["template_send_phone_verification_code_es"]({ otp: "123456" })).toBe(
      "123456 es su contraseña de un solo uso para verificar su número de teléfono con Noba.",
    );
  });

  it("should return proper message for wallet update verification code in English", async () => {
    expect(smsTemplates["template_send_wallet_verification_code_en"]({ otp: "123456" })).toBe(
      "123456 is your wallet verification code",
    );
  });

  it("should return proper message for wallet update verification code in Spanish", async () => {
    expect(smsTemplates["template_send_wallet_verification_code_es"]({ otp: "123456" })).toBe(
      "123456 es su código de verificación de billetera",
    );
  });
});
