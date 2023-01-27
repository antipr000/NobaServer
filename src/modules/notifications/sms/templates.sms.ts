export type TemplatePayload = {
  otp: string;
};

export const smsTemplates = {
  template_send_otp_en: (payload: TemplatePayload) => `${payload.otp} is your one-time password for Noba login.`,
  template_send_otp_es: (payload: TemplatePayload) =>
    `${payload.otp} es su contraseña de un solo uso para iniciar sesión en Noba.`,
  template_send_phone_verification_code_en: (payload: TemplatePayload) =>
    `${payload.otp} is your one-time password to verify your phone number with Noba.`,
  template_send_phone_verification_code_es: (payload: TemplatePayload) =>
    `${payload.otp} es su contraseña de un solo uso para verificar su número de teléfono con Noba.`,
  template_send_wallet_verification_code_en: (payload: TemplatePayload) =>
    `${payload.otp} is your wallet verification code`,
  template_send_wallet_verification_code_es: (payload: TemplatePayload) =>
    `${payload.otp} es su código de verificación de billetera`,
};
