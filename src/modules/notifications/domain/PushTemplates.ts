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
    en: "template_send_deposit_successfull_en",
  },
  WITHDRAWAL_COMPLETED_PUSH: {
    en: "template_send_withdrawal_successfull_en",
  },
  TRANSFER_COMPLETED_PUSH: {
    en: "template_send_transfer_successfull_sender_en",
  },
  TRANSFER_RECEIVED_PUSH: {
    en: "template_send_transfer_successfull_receiver_en",
  },
};
