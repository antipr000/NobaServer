export const SMSTemplate = {
  getOrDefault: (templateObject: object, locale: string): string => {
    if (!templateObject[locale]) {
      return templateObject["en"];
    }
    return templateObject[locale];
  },
  LOGIN_OTP_SMS: {
    en: "template_send_otp_en",
    es: "template_send_otp_es",
  },
  PHONE_VERIFICATION_CODE_SMS: {
    en: "template_send_phone_verification_code_en",
    es: "template_send_phone_verification_code_es",
  },
  WALLET_VERIFICATION_CODE_SMS: {
    en: "template_send_wallet_verification_code_en",
    es: "template_send_wallet_verification_code_es",
  },
};
