import { readFileSync } from "fs";
import { LocaleUtils } from "../utils/LocaleUtils";
import { join } from "path";

describe("LocaleUtils", () => {
  jest.setTimeout(2000);

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe("normalizeLocale", () => {
    it.each([
      ["invalidlocale", "en-us"],
      [null, "en-us"],
      [undefined, "en-us"],
      ["", "en-us"],
    ])("Should return en-us for invalid or empty locale", (locale, normalizedLocale) => {
      const testLocale = locale as string;
      expect(LocaleUtils.normalizeLocale(testLocale)).toEqual(normalizedLocale);
    });

    it.each([
      ["en-us", "en-US"],
      ["en", "en"],
      ["es-co", "es-CO"],
      ["es", "es"],
      ["eur", "eur"],
    ])("Should return same string for valid locale", (locale, normalizedLocale) => {
      expect(LocaleUtils.normalizeLocale(locale)).toEqual(normalizedLocale);
    });

    it.each([
      ["en_US", "en-US"],
      ["en", "en"],
      ["es_CO", "es-CO"],
      ["es", "es"],
    ])("Should normalize underscore in locale", (locale, normalizedLocale) => {
      expect(LocaleUtils.normalizeLocale(locale)).toEqual(normalizedLocale);
    });
  });

  describe("localizeAmount", () => {
    it.each([
      ["en-us", 1000, "1,000"],
      ["en-us", 2000000, "2,000,000"],
      ["en-us", 300000.0, "300,000"],
      ["en-us", 400000000.0, "400,000,000"],
      ["en-us", 0.0025, "0.00"],
      ["es-co", 1000, "1.000"],
      ["es-co", 2000000, "2.000.000"],
      ["es-co", 300000.0, "300.000"],
      ["es-co", 400000000.0, "400.000.000"],
      ["es-co", 0.0025, "0,00"],
    ])("Should return localized integer amounts with no fraction digits", (locale, amount, localizedAmount) => {
      expect(LocaleUtils.localizeAmount(amount, locale)).toEqual(localizedAmount);
    });

    it.each([
      ["en-us", 1000.1, "1,000.10"],
      ["en-us", 2000000.12, "2,000,000.12"],
      ["en-us", 300000.123, "300,000.12"],
      ["en-us", 400000000.1234, "400,000,000.12"],
      ["en-us", 0.0025, "0.00"],
      ["es-co", 1000.1, "1.000,10"],
      ["es-co", 2000000.12, "2.000.000,12"],
      ["es-co", 300000.123, "300.000,12"],
      ["es-co", 400000000.1234, "400.000.000,12"],
      ["es-co", 0.0025, "0,00"],
    ])("Should return localized decimal amounts with 2 fraction digits", (locale, amount, localizedAmount) => {
      expect(LocaleUtils.localizeAmount(amount, locale)).toEqual(localizedAmount);
    });

    it.each([
      ["en-us", 1000.1, "1,000.1"],
      ["en-us", 2000000.123, "2,000,000.123"],
      ["en-us", 300000.1234, "300,000.1234"],
      ["en-us", 400000000.12345, "400,000,000.12345"],
      ["en-us", 0.00000001234, "0.00000001"],
      ["es-co", 1000.1, "1.000,1"],
      ["es-co", 2000000.123, "2.000.000,123"],
      ["es-co", 300000.1234, "300.000,1234"],
      ["es-co", 400000000.12345, "400.000.000,12345"],
      ["es-co", 0.00000001234, "0,00000001"],
    ])(
      "Should return localized decimal amounts with max 8 trimmed fraction digits",
      (locale, amount, localizedAmount) => {
        expect(LocaleUtils.localizeAmount(amount, locale, false)).toEqual(localizedAmount);
      },
    );

    it.each([
      ["en-us", undefined],
      ["en-us", null],
      ["es-co", undefined],
      ["es-co", null],
    ])("Should throw error for null or undefined amount", (locale, amount) => {
      const testAmount: number = amount as number;
      expect(() => LocaleUtils.localizeAmount(testAmount, locale)).toThrowError();
    });
  });

  describe("convertToColumbianDate", () => {
    // IST is 10:30 hr ahead of Columbian time.
    it("should return date in YYYY-MM-DD format even if month and day has single digit", () => {
      // Wednesday, 5 April 2023 11:00:00 GMT+05:30
      const epochTimestampInSeconds = "1680672600";

      expect(LocaleUtils.convertToColumbianDate(epochTimestampInSeconds)).toBe("2023-04-05");
    });

    it("should return previous date if time is < 10:30 hr in IST", () => {
      // Wednesday, 5 April 2023 10:00:00 GMT+05:30
      const epochTimestampInSeconds = "1680669000";

      expect(LocaleUtils.convertToColumbianDate(epochTimestampInSeconds)).toBe("2023-04-04");
    });

    it("should return current date if time is exactly at 00:00 in Columbia", () => {
      // Wednesday, 5 April 2023 10:30:00 GMT+05:30
      const epochTimestampInSeconds = "1680670800";

      expect(LocaleUtils.convertToColumbianDate(epochTimestampInSeconds)).toBe("2023-04-05");
    });

    it("should return previous date correctly, 'if time is < 10:30 hr in IST' AND 'today is 1st date of the month'", () => {
      // Sunday, 1 October 2023 10:00:00 GMT+05:30
      const epochTimestampInSeconds = "1696134600";

      expect(LocaleUtils.convertToColumbianDate(epochTimestampInSeconds)).toBe("2023-09-30");
    });
  });

  describe("getTranslatedContent", () => {
    it("should return empty if translation key is empty", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "en-us",
          translationDomain: "General",
          translationKey: "",
        }),
      ).toBe("");
    });

    it("should return empty if translation domain is not found", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "en-us",
          translationDomain: "TRANSLATION_DOMAIN_NOT_FOUND",
          translationKey: "TRANSLATION_KEY_NOT_FOUND",
        }),
      ).toBe("");
    });

    it("should return empty if translation key is not found in translation domain", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "en-us",
          translationDomain: "General",
          translationKey: "TRANSLATION_KEY_NOT_FOUND",
        }),
      ).toBe("");
    });

    it("should return translated content if translation key is found in translation domain", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "en-us",
          translationDomain: "General",
          translationKey: "TRANSACTION_FAILED",
        }),
      ).toBe("Transaction failed.");
    });

    it.each([[""], ["test"], ["fake-locale"], [null], [undefined]])(
      "should default to english if locale is not found",
      locale => {
        const testLocale = locale as string;
        expect(
          LocaleUtils.getTranslatedContent({
            locale: testLocale,
            translationDomain: "General",
            translationKey: "TRANSACTION_FAILED",
          }),
        ).toBe("Transaction failed.");
      },
    );

    it("should return translated transaction event text with no params", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "prk",
          translationDomain: "TestDomain",
          translationKey: "NO_PARAMS_TEST",
        }),
      ).toBe("No Params.");
    });

    it("should return translated transaction event text with params but ignore them", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "prk",
          translationDomain: "TestDomain",
          translationKey: "NO_PARAMS_TEST",
          translationParams: {
            0: "PARAM1",
            1: "PARAM2",
            2: "PARAM3",
            3: "PARAM4",
            4: "PARAM5",
          },
        }),
      ).toBe("No Params.");
    });

    it("should return translated transaction event text with params", () => {
      expect(
        LocaleUtils.getTranslatedContent({
          locale: "prk",
          translationDomain: "TestDomain",
          translationKey: "PARAMS_TEST",
          translationParams: {
            0: "PARAM1",
            1: "PARAM2",
            2: "PARAM3",
            3: "PARAM4",
            4: "PARAM5",
          },
        }),
      ).toBe("Param 1:PARAM1, Param 2:PARAM2, Param 3:PARAM3, Param 4:PARAM4, Param 5:PARAM5");
    });

    it("all transaction event translation files should contain english keys", () => {
      const en = readFileSync(join(__dirname, "../../../appconfigs/i18n/translations_en.json"), "utf8");
      const es = readFileSync(join(__dirname, "../../../appconfigs/i18n/translations_es.json"), "utf-8");
      const enJSON = JSON.parse(en);
      const esJSON = JSON.parse(es);

      const enKeys = Object.keys(enJSON["TransactionEvent"]);
      const esKeys = Object.keys(esJSON["TransactionEvent"]);
      expect(enKeys).toEqual(esKeys);
    });
  });
});
