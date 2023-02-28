import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { BankName } from "../../../modules/psp/domain/BankFactoryTypes";
import { BalanceDTO } from "../../../modules/psp/dto/balance.dto";
import { ACCOUNT_BALANCE_TYPES } from "../domain/Admin";
import { AccountBalanceDTO } from "../dto/AccountBalanceDTO";

export class AdminPSPMapper {
  accountTypeToBankName(accountType: ACCOUNT_BALANCE_TYPES): BankName {
    switch (accountType) {
      case ACCOUNT_BALANCE_TYPES.CIRCLE:
        return BankName.CIRCLE;
      case ACCOUNT_BALANCE_TYPES.MONO:
        return BankName.MONO;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid account type",
        });
    }
  }

  async balanceDTOToAccountBalanceDTO(accountID: string, balanceDTO: BalanceDTO): Promise<AccountBalanceDTO> {
    return {
      accountID: accountID,
      balance: balanceDTO.balance,
      currency: balanceDTO.currency,
    };
  }
}
