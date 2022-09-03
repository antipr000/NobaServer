export class Utils {
  static getUsernameFromNameParts(firstName: string, lastName: string): string {
    // Only add a space if first & last name are both present
    return `${firstName ?? ""}${firstName && lastName ? " " : ""}${lastName ?? ""}` ?? "";
  }

  static roundTo2DecimalNumber(num: number): number {
    return this.roundToXDecimalNumber(num, 2);
  }

  static roundTo2DecimalString(num: number): string {
    return this.roundToXDecimalString(num, 2);
  }

  static roundToXDecimalNumber(num: number, decimals: number): number {
    return parseFloat(this.roundToXDecimalString(num, decimals));
  }

  static roundToXDecimalString(num: number, decimals: number): string {
    return num.toFixed(decimals);
  }
}
