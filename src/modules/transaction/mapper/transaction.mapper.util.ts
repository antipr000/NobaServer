import i18next from "i18next";
import { TransactionEvent } from "../domain/TransactionEvent";
import { TransactionFee } from "../domain/TransactionFee";
import { TransactionFeeDTO } from "../dto/TransactionDTO";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { join } from "path";
import FsBackend, { FsBackendOptions } from "i18next-fs-backend";

export const toTransactionFeesDTO = (transactionFees: TransactionFee): TransactionFeeDTO => {
  return {
    amount: transactionFees.amount,
    currency: transactionFees.currency,
    type: transactionFees.type,
  };
};

export const toTransactionEventDTO = (transactionEvent: TransactionEvent, locale?: string): TransactionEventDTO => {
  i18next.use(FsBackend).init<FsBackendOptions>({
    initImmediate: false,
    fallbackLng: "en",
    backend: {
      loadPath: join(__dirname, "../../../../appconfigs/i18n/translations_{{lng}}.json"),
    },
  });

  i18next.changeLanguage(locale || "en");
  const translationParams = {
    0: transactionEvent.param1,
    1: transactionEvent.param2,
    2: transactionEvent.param3,
    3: transactionEvent.param4,
    4: transactionEvent.param5,
  };

  let translatedContent = i18next.t(transactionEvent.key, translationParams);
  if (!transactionEvent.key || translatedContent === transactionEvent.key) {
    translatedContent = transactionEvent.message;
  }

  return {
    timestamp: transactionEvent.timestamp,
    internal: transactionEvent.internal,
    message: transactionEvent.message,
    ...(transactionEvent.details !== undefined && { details: transactionEvent.details }),
    text: translatedContent,
  };
};
