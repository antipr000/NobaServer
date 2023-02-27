import { BankName } from "src/modules/psp/domain/BankFactoryTypes";
import { ACCOUNT_BALANCE_TYPES } from "../domain/Admin";

export class AdminPSPMapper {
  accountTypeToBankName(accountType: ACCOUNT_BALANCE_TYPES): BankName {
    switch (accountType) {
      case ACCOUNT_BALANCE_TYPES.CIRCLE:
        return BankName.CIRCLE;
      case ACCOUNT_BALANCE_TYPES.MONO:
        return BankName.MONO;
      default:
        throw new Error("Invalid account type");
    }
  }
}
