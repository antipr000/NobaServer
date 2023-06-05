import i18next from "i18next";
import { TransactionEvent } from "../domain/TransactionEvent";
import { TransactionFee } from "../domain/TransactionFee";
import { TransactionFeeDTO } from "../dto/TransactionDTO";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { join } from "path";
import FsBackend, { FsBackendOptions } from "i18next-fs-backend";
import { Utils } from "../../../core/utils/Utils";
import { LocaleUtils } from "../../../core/utils/LocaleUtils";

export const toTransactionFeesDTO = (transactionFees: TransactionFee): TransactionFeeDTO => {
  return {
    amount: transactionFees.amount,
    currency: transactionFees.currency,
    type: transactionFees.type,
  };
};

export const toTransactionEventDTO = async (
  transactionEvent: TransactionEvent,
  locale?: string,
): Promise<TransactionEventDTO> => {
  const translationParams = {
    0: transactionEvent.param1,
    1: transactionEvent.param2,
    2: transactionEvent.param3,
    3: transactionEvent.param4,
    4: transactionEvent.param5,
  };
  const translatedContent = LocaleUtils.getTranslatedContent({
    locale: locale,
    translationDomain: "TransactionEvent",
    translationKey: transactionEvent.key,
    translationParams: translationParams,
  });

  return {
    timestamp: transactionEvent.timestamp,
    internal: transactionEvent.internal,
    message: transactionEvent.message,
    ...(transactionEvent.details !== undefined && { details: transactionEvent.details }),
    text: translatedContent,
  };
};
