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
    var shift = function (value, exponent: number) {
      value = (value + "e").split("e");
      return +(value[0] + "e" + (+value[1] + (exponent || 0)));
    };
    var n = shift(num, +decimalPlaces);
    return shift(Math.round(n), -decimalPlaces).toFixed(decimalPlaces);
  }
}
