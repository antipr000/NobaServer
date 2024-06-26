import { randomBytes, randomUUID } from "crypto"; // built-in node crypto, not from npm
import { customAlphabet } from "nanoid";
export class Utils {
  static TEST_USER_EMAIL = "rosie@noba.com";

  static sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  static getUsernameFromNameParts(firstName: string, lastName: string): string {
    // Only add a space if first & last name are both present
    return `${firstName ?? ""}${firstName && lastName ? " " : ""}${lastName ?? ""}` ?? "";
  }

  static roundTo2DecimalNumber(num: number): number {
    return this.roundToSpecifiedDecimalNumber(num, 2);
  }

  static roundTo2DecimalString(num: number): string {
    return this.roundToSpecifiedDecimalString(num, 2);
  }

  static roundToSpecifiedDecimalNumber(num: number, decimals: number): number {
    return Number(this.roundToSpecifiedDecimalString(num, decimals));
  }

  static roundToSpecifiedDecimalString(num: number, decimals: number): string {
    return this.round(num, decimals);
  }

  private static round(num: number, decimalPlaces: number): string {
    const shift = function (value: number, exponent: number) {
      const valueUpdated = (value + "e").split("e");
      return +(valueUpdated[0] + "e" + (+valueUpdated[1] + (exponent || 0)));
    };
    const n = shift(num, +decimalPlaces);
    return shift(Math.round(n), -decimalPlaces).toFixed(decimalPlaces);
  }

  /**
   * Rounds num up to the nearest 'nearest' number. For example, if num is 1.2 and nearest is 0.5, the result will be 1.5.
   * @param num Number to round up to the nearest 'nearest' number
   * @param nearest Nearest fractional number to round up to
   * @returns
   */
  public static roundUpToNearest(num: number, nearest: number): number {
    const multiplier = 1 / nearest;
    return Math.ceil(num * multiplier) / multiplier;
  }

  static generateLowercaseUUID(removeDashes = false): string {
    // 1. Generate UUID
    // 2. Convert to lowercase
    // 3. Optionally remove all hyphens
    const uuid = randomUUID().toLowerCase();
    return removeDashes ? uuid.replace(/-/g, "") : uuid;
  }

  static generateUUID(): string {
    return randomUUID();
  }

  static generateBase64String(numBytes: number): string {
    return randomBytes(numBytes).toString("base64");
  }

  static isEmail(emailOrPhone: string) {
    if (!emailOrPhone) throw new Error("emailOrPhone is required to check if the string is an email");
    return emailOrPhone.includes("@");
  }

  static isValidEmail(email: string): boolean {
    if (!email) return false;

    const emailRegEx =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegEx.test(email);
  }

  static generateOTP(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  static get6DigitDate(): number {
    const date = new Date(Date.now()); // Use this instead of new Date() so we can mock Date.now() in tests
    return Number(
      date.getFullYear().toString().substring(2, 4) +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        date.getDate().toString().padStart(2, "0"),
    );
  }

  static stripSpaces(value: string): string {
    if (value === undefined || value === null) {
      return value;
    }

    return value.replace(/\s/g, "");
  }

  static stripNonPhoneChars(value: string): string {
    if (value === undefined || value === null) {
      return value;
    }

    const regex = /[^0-9+]/g;

    return value.replace(regex, "");
  }

  static getCodeTypeFromCardScheme(scheme: string): string {
    switch (scheme) {
      case "visa":
        return "CVV";
      case "mastercard":
        return "CVC";
      case "american-express":
        return "CID";
      case "diners-club":
        return "CVV";
      case "discover":
        return "CID";
      case "jcb":
        return "CVV";
      case "unionpay":
        return "CVN";
      case "maestro":
        return "CVV";
    }
  }

  static cleanValue(value: any): any {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value === "string") {
      // Some callers cannot pass actual nulls so this is a bit of a hacky workaround
      if (value === "null") {
        return null;
      }

      // Convert empty strings to null
      return value.trim() === "" ? null : value.trim();
    } else {
      return value;
    }
  }

  static enumFromValue = <T extends Record<string, string>>(val: string, _enum: T) => {
    if (val === undefined) return undefined;
    const enumName = (Object.keys(_enum) as Array<keyof T>).find(k => _enum[k] === val);
    if (!enumName) return undefined;
    return _enum[enumName];
  };

  static getAlphaNanoID(length: number): string {
    // 0-9 and a-z (no vowels to avoid bad words)
    const nanoid = customAlphabet("1234567890bcdfghjklmnpqrstvwxyz", length);
    return nanoid();
  }

  static getCurrentEasternTimezone(): string {
    try {
      const now = new Date(Date.now()); // Use this instead of new Date() so we can mock Date.now() in tests
      return now.toLocaleString("en-us", { timeZone: "America/New_York", timeZoneName: "short" }).match(/(EDT|EST)/)[1];
    } catch (err) {
      // There should really NEVER be an error here, but if there is, just log it and return EST
      console.error(`Error getting current Eastern timezone: ${err}`);
      return "EST";
    }
  }

  static getCurrentEasternTimezoneOffset(): string {
    return this.getCurrentEasternTimezone() === "EDT" ? "-04:00" : "-05:00";
  }
}
