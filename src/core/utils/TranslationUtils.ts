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

export class TranslationUtils {
  static async getTranslatedContent({
    locale,
    translationDomain,
    translationKey,
    translationParams,
  }: {
    locale: string;
    translationDomain: string;
    translationKey: string;
    translationParams: ITranslationParams;
  }) {
    let normalizedLocale = Utils.normalizeLocale(locale);
    await i18next.use(FsBackend).init<FsBackendOptions>({
      initImmediate: false,
      fallbackLng: "en-us",
      lng: normalizedLocale,
      backend: {
        loadPath: join(__dirname, "../../../../appconfigs/i18n/translations_{{lng}}.json"),
      },
    });

    await i18next.changeLanguage(normalizedLocale || "en-us");

    const transactionEventKey = `${translationDomain}.${translationKey}`;

    let translatedContent = i18next.t(transactionEventKey, translationParams);
    if (!transactionEventKey || translatedContent === transactionEventKey) {
      translatedContent = "";
    }

    return translatedContent;
  }
}
