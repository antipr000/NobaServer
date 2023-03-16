export const SMSTemplate = {
  getOrDefault: (templateObject: object, locale: string): string => {
    locale = locale.toLowerCase();
    if (templateObject[locale]) {
      return templateObject[locale];
    }

    const localePrefix = locale.split("_")[0];

    if (templateObject[localePrefix]) {
      return templateObject[localePrefix];
    }

    return templateObject["en"];
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
