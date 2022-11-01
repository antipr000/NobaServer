import { randomBytes, randomUUID } from "crypto"; // built-in node crypto, not from npm

export class Utils {
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

  private static round(num, decimalPlaces: number): string {
    const shift = function (value, exponent: number) {
      value = (value + "e").split("e");
      return +(value[0] + "e" + (+value[1] + (exponent || 0)));
    };
    const n = shift(num, +decimalPlaces);
    return shift(Math.round(n), -decimalPlaces).toFixed(decimalPlaces);
  }

  static generateLowercaseUUID(removeDashes = false): string {
    // 1. Generate UUID
    // 2. Convert to lowercase
    // 3. Optionally remove all hyphens
    const uuid = randomUUID().toLowerCase();
    return removeDashes ? uuid.replace(/-/g, "") : uuid;
  }

  static generateBase64String(numBytes: number): string {
    return randomBytes(numBytes).toString("base64");
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
}
