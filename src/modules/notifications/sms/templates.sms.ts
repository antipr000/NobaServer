export type TemplatePayload = {
  otp: string;
};

export const smsTemplates = {
  template_send_otp: (payload: TemplatePayload) => `${payload.otp} is your one-time password for Noba login.`,
  template_send_phone_verification_code: (payload: TemplatePayload) =>
    `${payload.otp} is your one-time password to verify your phone number with Noba.`,
  template_send_wallet_verification_code: (payload: TemplatePayload) =>
    `${payload.otp} is your wallet verification code`,
};
