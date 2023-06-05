import i18next from "i18next";
import FsBackend, { FsBackendOptions } from "i18next-fs-backend";
import { join } from "path";
import { Utils } from "./Utils";

export interface ITranslationParams {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
}

export class LocaleUtils {
  static getTranslatedContent({
    locale,
    translationDomain,
    translationKey,
    translationParams,
  }: {
    locale: string;
    translationDomain: string;
    translationKey: string;
    translationParams?: ITranslationParams;
  }) {
    let normalizedLocale = Utils.normalizeLocale(locale);

    i18next.use(FsBackend).init<FsBackendOptions>({
      initImmediate: false,
      fallbackLng: "en-us",
      lng: normalizedLocale,
      backend: {
        loadPath: join(__dirname, "../../../appconfigs/i18n/translations_{{lng}}.json"),
      },
    });

    const transactionEventKey = `${translationDomain}.${translationKey}`;

    let translatedContent = i18next.t(transactionEventKey, translationParams);
    if (!transactionEventKey || translatedContent === transactionEventKey) {
      translatedContent = "";
    }

    return translatedContent;
  }
}
