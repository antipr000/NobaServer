export const PushTemplates = {
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
  DEPOSIT_COMPLETED_PUSH: {
    en: "template_send_deposit_successful_en",
    es: "template_send_deposit_successful_es",
  },
  DEPOSIT_FAILED_PUSH: {
    en: "template_send_deposit_failed_en",
    es: "template_send_deposit_failed_es",
  },
  WITHDRAWAL_COMPLETED_PUSH: {
    en: "template_send_withdrawal_successful_en",
    es: "template_send_withdrawal_successful_es",
  },
  WITHDRAWAL_FAILED_PUSH: {
    en: "template_send_withdrawal_failed_en",
    es: "template_send_withdrawal_failed_es",
  },
  TRANSFER_COMPLETED_PUSH: {
    en: "template_send_transfer_successful_sender_en",
    es: "template_send_transfer_successful_sender_es",
  },
  TRANSFER_FAILED_PUSH: {
    en: "template_send_transfer_failed_en",
    es: "template_send_transfer_failed_es",
  },
  TRANSFER_RECEIVED_PUSH: {
    en: "template_send_transfer_successful_receiver_en",
    es: "template_send_transfer_successful_receiver_es",
  },
  COLLECTION_COMPLETED_PUSH: {
    en: "template_send_collection_completed_en",
    es: "template_send_collection_completed_es",
  },
  PAYROLL_DEPOSIT_COMPLETED_PUSH: {
    en: "template_send_payroll_deposit_completed_en",
    es: "template_send_payroll_deposit_completed_es",
  },
};