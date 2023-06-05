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
    let normalizedLocale = this.normalizeLocale(locale);

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

  static localizeAmount(amount: number, locale: string, trimFractionDigits = true): string {
    if (amount === undefined || amount === null) {
      throw new Error("Amount is required to localize.");
    }

    const normalizedLocale = this.normalizeLocale(locale); // Required hyphen instead of underscore for Intl.Locale

    if (amount % 1 === 0) {
      return amount.toLocaleString(normalizedLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }

    if (trimFractionDigits) {
      const roundedAmount = Utils.roundTo2DecimalNumber(amount);
      return roundedAmount.toLocaleString(normalizedLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return amount.toLocaleString(normalizedLocale, {
      maximumFractionDigits: 8,
    });
  }

  static normalizeLocale(locale: string): string {
    if (!locale) {
      return "en-us";
    }

    const normalizedLocale = locale.replace("_", "-");

    try {
      const validatedLocale = new Intl.Locale(normalizedLocale);
      return validatedLocale.toString();
    } catch (err) {
      return "en-us";
    }
  }

  static convertToColumbianDate(unixTimestampSeconds: string): string {
    const unixTimestampInMillis: number = Number(unixTimestampSeconds) * 1000;
    const date = new Date(unixTimestampInMillis);

    // Specify the time zone as "America/Bogota" for the Colombian Standard Timezone
    const options = {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    } as Intl.DateTimeFormatOptions;

    // Format the date using the specified time zone and desired format
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);

    // Extract the year, month, and day from the parts
    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;
    const day = parts.find(part => part.type === "day").value;

    // Assemble the formatted date - "YYYY-MM-DD" format.
    const formattedColumbianDate = `${year}-${month}-${day}`;
    return formattedColumbianDate;
  }
}
