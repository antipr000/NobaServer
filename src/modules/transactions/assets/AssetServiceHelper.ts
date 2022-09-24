import { Utils } from "../../../core/utils/Utils";
import { DiscountedAmount } from "../domain/AssetTypes";

export function getDiscountedAmount(value: number, discountPercent: number, roundTo?: number): DiscountedAmount {
  if (!discountPercent) discountPercent = 1;

  return {
    value: roundTo ? Utils.roundToSpecifiedDecimalNumber(value, roundTo) : value,
    discountedValue: roundTo
      ? Utils.roundToSpecifiedDecimalNumber(value * discountPercent, roundTo)
      : value * discountPercent,
  };
}
