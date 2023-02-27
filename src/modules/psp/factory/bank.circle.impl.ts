import { Inject } from "@nestjs/common";
import { IBankImpl } from "./ibank.impl";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { CircleService } from "../circle.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { BalanceDTO } from "../dto/balance.dto";

export class BankCircleImpl implements IBankImpl {
  @Inject()
  private readonly circleService: CircleService;

  async getBalance(accountID: string): Promise<BalanceDTO> {
    // hardcoded to USD for now until refactoring to return currency from circleService
    return {
      balance: await this.circleService.getWalletBalance(accountID),
      currency: "USD",
    };
  }

  async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
    });
  }
}
