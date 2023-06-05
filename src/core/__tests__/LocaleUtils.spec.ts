import { LocaleUtils } from "../utils/LocaleUtils";

describe("Utils", () => {
  jest.setTimeout(2000);

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe("normalizeLocale", () => {
    it("Should return en-us for empty locale", () => {
      expect(LocaleUtils.normalizeLocale(null)).toEqual("en-us");
    });

    it("Should return en-us for invalid locale", () => {
      expect(LocaleUtils.normalizeLocale("invalidlocale")).toEqual("en-us");
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
      ["en-us", null],
      ["en-us", undefined],
      ["es-co", null],
      ["es-co", undefined],
    ])("Should throw error for null or undefined amount", (locale, amount) => {
      expect(() => LocaleUtils.localizeAmount(amount, locale)).toThrowError();
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
});
