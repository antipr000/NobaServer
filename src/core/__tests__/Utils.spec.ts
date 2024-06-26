import { Utils } from "../utils/Utils";

describe("Utils", () => {
  jest.setTimeout(2000);

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe("roundTo2DecimalNumber()", () => {
    it("It should round to 2 decimals", () => {
      expect(Utils.roundTo2DecimalNumber(50.1234)).toEqual(50.12);
    });
  });

  describe("roundToSpecifiedDecimalNumber()", () => {
    it("It should round to 10 decimals", () => {
      expect(Utils.roundToSpecifiedDecimalNumber(50.123456789123456, 10)).toEqual(50.1234567891);
    });
  });

  describe("roundToSpecifiedDecimalNumber() and roundToSpecifiedDecimalString()", () => {
    class TestScenario {
      inputNumber: number;
      precision: number;
      expectedNumber: number;
      expectedString: string;
    }
    const testScenarios: TestScenario[] = [
      {
        inputNumber: 50.1234,
        precision: 2,
        expectedNumber: 50.12,
        expectedString: "50.12",
      },
      {
        inputNumber: 50.1,
        precision: 2,
        expectedNumber: 50.1,
        expectedString: "50.10",
      },
      {
        inputNumber: 50,
        precision: 2,
        expectedNumber: 50.0,
        expectedString: "50.00",
      },
      {
        inputNumber: 50.123456789123456,
        precision: 10,
        expectedNumber: 50.1234567891,
        expectedString: "50.1234567891",
      },
      {
        inputNumber: 50.123456,
        precision: 10,
        expectedNumber: 50.123456,
        expectedString: "50.1234560000",
      },
      {
        inputNumber: 50.123456,
        precision: 5,
        expectedNumber: 50.12346,
        expectedString: "50.12346",
      },
      {
        inputNumber: 50.123456,
        precision: 3,
        expectedNumber: 50.123,
        expectedString: "50.123",
      },
      {
        inputNumber: 13.555,
        precision: 2,
        expectedNumber: 13.56,
        expectedString: "13.56",
      },
      {
        inputNumber: 13.5551,
        precision: 2,
        expectedNumber: 13.56,
        expectedString: "13.56",
      },
      {
        inputNumber: 50.123556,
        precision: 3,
        expectedNumber: 50.124,
        expectedString: "50.124",
      },
      {
        inputNumber: 50.123456,
        precision: 0,
        expectedNumber: 50,
        expectedString: "50",
      },
      {
        inputNumber: 50.5,
        precision: 0,
        expectedNumber: 51,
        expectedString: "51",
      },
    ];

    it("Should round to the expected number of decimals with 5 rounding up", () => {
      testScenarios.forEach(scenario => {
        expect(Utils.roundToSpecifiedDecimalNumber(scenario.inputNumber, scenario.precision)).toEqual(
          scenario.expectedNumber,
        );
        expect(Utils.roundToSpecifiedDecimalString(scenario.inputNumber, scenario.precision)).toEqual(
          scenario.expectedString,
        );
      });
    });
  });

  describe("roundTo2DecimalString()", () => {
    it("It should round to 2 decimals", () => {
      expect(Utils.roundTo2DecimalString(50.1234)).toEqual("50.12");
    });

    it("It should round to 2 decimals including insignificant zeroes", () => {
      expect(Utils.roundTo2DecimalString(50.1)).toEqual("50.10");
    });

    it("It should add decimals if desired precision is greater than input value", () => {
      expect(Utils.roundTo2DecimalString(50)).toEqual("50.00");
    });
  });

  describe("roundToSpecifiedDecimalString()", () => {
    it("It should round to 10 decimals", () => {
      expect(Utils.roundToSpecifiedDecimalString(50.123456789123456, 10)).toEqual("50.1234567891");
    });

    it("It should round to 10 decimals including insignificant zeroes", () => {
      expect(Utils.roundToSpecifiedDecimalString(50.123456789012345, 10)).toEqual("50.1234567890");
    });

    it("It should round to 1 decimal", () => {
      expect(Utils.roundToSpecifiedDecimalString(50.123456789123456, 1)).toEqual("50.1");
    });

    it("It should round down to 0 decimals", () => {
      expect(Utils.roundToSpecifiedDecimalString(50.123456789012345, 0)).toEqual("50");
    });

    it("It should round up to 0 decimals", () => {
      expect(Utils.roundToSpecifiedDecimalString(50.999, 0)).toEqual("51");
    });
  });

  describe("roundUpToNearest()", () => {
    it("It should round up to the nearest .05", () => {
      expect(Utils.roundUpToNearest(38.0, 0.05)).toEqual(38.0);
      expect(Utils.roundUpToNearest(38.01, 0.05)).toEqual(38.05);
      expect(Utils.roundUpToNearest(38.02, 0.05)).toEqual(38.05);
      expect(Utils.roundUpToNearest(38.03, 0.05)).toEqual(38.05);
      expect(Utils.roundUpToNearest(38.04, 0.05)).toEqual(38.05);
      expect(Utils.roundUpToNearest(38.05, 0.05)).toEqual(38.05);
      expect(Utils.roundUpToNearest(38.06, 0.05)).toEqual(38.1);
      expect(Utils.roundUpToNearest(38.07, 0.05)).toEqual(38.1);
      expect(Utils.roundUpToNearest(38.08, 0.05)).toEqual(38.1);
      expect(Utils.roundUpToNearest(38.09, 0.05)).toEqual(38.1);
      expect(Utils.roundUpToNearest(38.1, 0.05)).toEqual(38.1);
    });

    it("It should round up to the nearest 10", () => {
      expect(Utils.roundUpToNearest(40, 10)).toEqual(40);
      expect(Utils.roundUpToNearest(41, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(42, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(43, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(44, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(45, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(46, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(47, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(48, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(49, 10)).toEqual(50);
      expect(Utils.roundUpToNearest(50, 10)).toEqual(50);
    });
  });

  describe("getUsernameFromNameParts()", () => {
    it("It should join names together", () => {
      expect(Utils.getUsernameFromNameParts("Joe", "Cool")).toEqual("Joe Cool");
    });

    it("It should handle last name with empty first name", () => {
      expect(Utils.getUsernameFromNameParts("", "Cool")).toEqual("Cool");
    });

    it("It should handle last name with null first name", () => {
      expect(Utils.getUsernameFromNameParts(null, "Cool")).toEqual("Cool");
    });

    it("It should handle last name with undefined first name", () => {
      expect(Utils.getUsernameFromNameParts(undefined, "Cool")).toEqual("Cool");
    });

    it("It should handle first name with empty last name", () => {
      expect(Utils.getUsernameFromNameParts("Joe", "")).toEqual("Joe");
    });

    it("It should handle first name with null last name", () => {
      expect(Utils.getUsernameFromNameParts("Joe", null)).toEqual("Joe");
    });

    it("It should handle first name with undefined last name", () => {
      expect(Utils.getUsernameFromNameParts("Joe", undefined)).toEqual("Joe");
    });

    it("It should return empty for empty strings", () => {
      expect(Utils.getUsernameFromNameParts("", "")).toEqual("");
    });

    it("It should return empty for undefined first and last name", () => {
      expect(Utils.getUsernameFromNameParts(undefined, undefined)).toEqual("");
    });

    it("It should return empty for null first and last name", () => {
      expect(Utils.getUsernameFromNameParts(null, null)).toEqual("");
    });
  });

  describe("stripNonPhoneChars()", () => {
    it("It should strip spaces from phone number", () => {
      expect(Utils.stripNonPhoneChars("+ 1 2 34567 8910")).toEqual("+12345678910");
    });

    it("It should strip dashes from phone number", () => {
      expect(Utils.stripNonPhoneChars("+1-234-567-8910")).toEqual("+12345678910");
    });

    it("It should strip parentheses from phone number", () => {
      expect(Utils.stripNonPhoneChars("+1(234)5678910")).toEqual("+12345678910");
    });

    it("It should strip periods from phone number", () => {
      expect(Utils.stripNonPhoneChars("+1.234.567.8910")).toEqual("+12345678910");
    });

    it("It should strip spaces, dashes, parentheses, and periods from phone number", () => {
      expect(Utils.stripNonPhoneChars("+ 1-(234)567.8910")).toEqual("+12345678910");
    });

    it("It should return input value for undefined input", () => {
      expect(Utils.stripNonPhoneChars(undefined)).toEqual(undefined);
    });

    it("It should return input value for null input", () => {
      expect(Utils.stripNonPhoneChars(null)).toEqual(null);
    });
  });

  describe("stripSpaces()", () => {
    it("It should strip spaces from string", () => {
      expect(Utils.stripSpaces(" a b c ")).toEqual("abc");
    });

    it("It should return input value for undefined input", () => {
      expect(Utils.stripSpaces(undefined)).toEqual(undefined);
    });

    it("It should return input value for null input", () => {
      expect(Utils.stripSpaces(null)).toEqual(null);
    });
  });

  describe("getAlphaNanoID", () => {
    it("should return a 10-character nanoID", () => {
      const id = Utils.getAlphaNanoID(10);
      expect(id).toBeDefined();
      expect(id.length).toEqual(10);
    });

    it("should return a 15-character nanoID", () => {
      const id = Utils.getAlphaNanoID(15);
      expect(id).toBeDefined();
      expect(id.length).toEqual(15);
    });
  });

  describe("isEmail", () => {
    it("should return true if value contains @", () => {
      expect(Utils.isEmail("rosie@noba.com")).toEqual(true);
    });

    it("should return false if value does not contain @", () => {
      expect(Utils.isEmail("rosienoba")).toEqual(false);
    });

    it("should throw an Error if no input value is provided", () => {
      try {
        Utils.isEmail(null);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toEqual(new Error("emailOrPhone is required to check if the string is an email"));
      }
    });
  });

  describe("get6DigitDate", () => {
    it("Should generate a 6 digit date format", () => {
      jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 1, 14).getTime());
      expect(Utils.get6DigitDate()).toEqual(230214);
    });
  });

  describe("isValidEmail", () => {
    it("Should return true for valid email formats", () => {
      const validEmails = [
        "rosie@noba.com",
        "rosie+test@noba.com",
        "rosie@noba.co",
        "rosie-dog@noba.co",
        "rosie+test-dog@noba.com",
      ];
      validEmails.forEach(email => {
        expect(Utils.isValidEmail(email)).toEqual(true);
      });
    });

    it("Should return true for invalid email formats", () => {
      const invalidEmails = ["Rosie Noba", "rosie@noba", "rosienoba.com", "rosie@noba@com"];
      invalidEmails.forEach(email => {
        expect(Utils.isValidEmail(email)).toEqual(false);
      });
    });

    it("Should return true for no email provided", () => {
      expect(Utils.isValidEmail(null)).toEqual(false);
    });
  });

  describe("getNYDSTOffset", () => {
    it("Should return correct value for winter (non-DST) time", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 1, 14).getTime());
      expect(Utils.getCurrentEasternTimezone()).toEqual("EST");
      expect(nowSpy).toHaveBeenCalledTimes(1);
    });

    it("Should return correct value for summer (DST) time", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 7, 14).getTime());
      expect(Utils.getCurrentEasternTimezone()).toEqual("EDT");
      expect(nowSpy).toHaveBeenCalledTimes(1);
    });

    it("Should return EST if there is an error", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 7, 14).getTime());
      const toLocaleStringSpy = jest.spyOn(Date.prototype, "toLocaleString").mockReturnValueOnce("error");
      expect(Utils.getCurrentEasternTimezone()).toEqual("EST");
      expect(nowSpy).toHaveBeenCalledTimes(1);
      expect(toLocaleStringSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCurrentEasternTimezoneOffset", () => {
    it("Should return 5 hour offset for winter (non-DST) time", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 1, 14).getTime());
      expect(Utils.getCurrentEasternTimezoneOffset()).toEqual("-05:00");
      expect(nowSpy).toHaveBeenCalledTimes(1);
    });

    it("Should return 4 hour offset for summer (DST) time", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 7, 14).getTime());
      expect(Utils.getCurrentEasternTimezoneOffset()).toEqual("-04:00");
      expect(nowSpy).toHaveBeenCalledTimes(1);
    });

    it("Should return 5 hour offset if there is an error", () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 7, 14).getTime());
      const toLocaleStringSpy = jest.spyOn(Date.prototype, "toLocaleString").mockReturnValueOnce("error");
      expect(Utils.getCurrentEasternTimezoneOffset()).toEqual("-05:00");
      expect(nowSpy).toHaveBeenCalledTimes(1);
      expect(toLocaleStringSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanValue", () => {
    it("should return undefined if value is undefined", () => {
      expect(Utils.cleanValue(undefined)).toBe(undefined);
    });

    it("should return null if value is null", () => {
      expect(Utils.cleanValue(null)).toBe(null);
    });

    it('should return null if value is "null"', () => {
      expect(Utils.cleanValue("null")).toBe(null);
    });

    it("should return null if value is an empty string", () => {
      expect(Utils.cleanValue("")).toBe(null);
    });

    it("should return null if value is a whitespace string", () => {
      expect(Utils.cleanValue("   ")).toBe(null);
    });

    it("should return the trimmed string if value is a non-empty string", () => {
      expect(Utils.cleanValue("  hello  ")).toBe("hello");
    });

    it("should return the value unchanged if it is not a string", () => {
      expect(Utils.cleanValue(123)).toBe(123);
      expect(Utils.cleanValue(true)).toBe(true);
      expect(Utils.cleanValue({ key: "value" })).toEqual({ key: "value" });
    });
  });
});
