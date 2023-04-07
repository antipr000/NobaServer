export const EmailTemplates = {
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
  OTP_EMAIL: {
    en: "d-62a393f5f89949f5a5a3d244a51ed2e7",
    es: "d-5e14091f8be44f9bb0689752411163a3",
  },
  WELCOME_EMAIL: {
    en: "d-0c8d633f6de545c6a562ac8e6d53917d",
    es: "d-cd852911b9014a719cd9c8d3b5b0a841",
  },
  ID_VERIFICATION_SUCCESSFUL_US_EMAIL: {
    en: "d-2d55cada60ab46209d6d5bcfe9c450d7",
    es: "d-874a99d468ca40b0b42b471d9213e1dd",
  },
  ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL: {
    // Same as US for now but this may eventually change.
    en: "d-2d55cada60ab46209d6d5bcfe9c450d7",
    es: "d-874a99d468ca40b0b42b471d9213e1dd",
  },
  KYC_DENIED_EMAIL: {
    en: "d-fac2f33374c443cb855641727a735708",
    es: "d-e1e2826a573c4503a067cdc4cf560ca9",
  },
  KYC_FLAGGED_EMAIL: {
    en: "d-d25d29442cf44338b72e15ea75bcab26",
    es: "d-953a7e77c37941688a871bb30e5e8d76",
  },
  DOC_VERIFICATION_PENDING_EMAIL: {
    en: "d-9f03c94f41f64b6ea2ec9343f1bc8b7f",
    es: "d-df43f46868d946aeb8a660b8eacf609f",
  },
  DOC_VERIFICATION_REJECTED_EMAIL: {
    en: "d-06519883cba548dba2f2202ad58b12fa",
  },
  DOC_VERIFICATION_FAILED_TECH_EMAIL: {
    en: "d-b523c0e37772460bbd60e14af2fa50a0",
  },
  CARD_ADDED_EMAIL: {
    en: "d-8bb9892cbbc1405aa9f833229c9db2e2",
  },
  CARD_ADDITION_FAILED_EMAIL: {
    en: "d-cb1c929f24734c9099f7ba90e08f53ee",
  },
  CARD_DELETED_EMAIL: {
    en: "d-b0e06a32f6674552979243a2542409b4",
  },
  NOBA_INTERNAL_HARD_DECLINE: {
    en: "d-ce84b831db6842e5a3eb47730e837618",
  },
  WALLET_UPDATE_OTP: {
    en: "d-ac14193dfd58407fb2fc5594ad6e2108",
  },
  DEPOSIT_SUCCESSFUL_EMAIL: {
    en: "d-f085402c06584fe2a843c8e9dff2ed4b",
    es: "d-d6b8f9ac6d3e414cb8da0c38216a9d26",
  },
  DEPOSIT_FAILED_EMAIL: {
    en: "d-910099ff234c432f9c2246c71961353e",
    es: "d-90642bf2c09c41b58bd4c74b985c516b",
  },
  DEPOSIT_INITIATED_EMAIL: {
    en: "d-7e413692c9f8497c80d5b5e2a5218171",
    es: "d-d77bf9be0e1b417cbcb1375ec47f3263",
  },
  WITHDRAWAL_SUCCESSFUL_EMAIL: {
    en: "d-3fb3c83cdfd346ffa2d4c4021bc4ef2b",
    es: "d-9af9b2e7e2eb49ef8292bb6cb71945f1",
  },
  WITHDRAWAL_FAILED_EMAIL: {
    en: "d-13a9459f11bb458aac117ad66dd1ccff",
    es: "d-020b26b11925437681157745f9967d76",
  },
  WITHDRAWAL_INITIATED_EMAIL: {
    en: "d-910099ff234c432f9c2246c71961353e",
    es: "d-b468886c63f140cb87d3b4c907ee9fb5",
  },
  TRANSFER_SUCCESSFUL_EMAIL: {
    en: "d-1c758bcf9eae40ed83c3cd9152ed17c4",
    es: "d-82d724063f4c42ad928a30e7998bcd76",
  },
  TRANSFER_RECEIVED_EMAIL: {
    en: "d-003b215b896947ffa52c90fbafb9b33c",
    es: "d-e3de834595c44e09983e69db1c4c018e",
  },
  TRANSFER_FAILED_EMAIL: {
    en: "d-c2f615c6c81147c9b3666cb6fd1c93b8",
    es: "d-d806e77606f04b7fb953aaa728f8ae2a",
  },
  PAYROLL_DEPOSIT_COMPLETED_EMAIL: {
    en: "d-0791ccff11c7416ca5eceaac66d430cd",
    es: "d-4bf8f1e412034f59aef4c0265e4017c2",
  },
  COLLECTION_LINK_EMAIL: {},
  EMPLOYER_REQUEST_EMAIL: {
    en: "d-db917173c48448fb90dadcb77259f4cc",
  },
};
