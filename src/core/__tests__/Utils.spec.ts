import { Utils } from "../utils/Utils";

describe("Utils", () => {
  jest.setTimeout(2000);

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
});
