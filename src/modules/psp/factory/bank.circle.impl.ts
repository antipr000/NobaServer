import { Inject } from "@nestjs/common";
import { IBankImpl } from "./ibank.impl";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../domain/BankFactoryTypes";
import { MonoCurrency, MonoTransactionType } from "../domain/Mono";
import { CircleService } from "../circle.service";
import { ServiceErrorCode, ServiceException } from "src/core/exception/service.exception";

export class BankCircleImpl implements IBankImpl {
  @Inject()
  private readonly circleService: CircleService;

  async getBalance(accountID: string): Promise<number> {
    return 1;
  }

  async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
    });
  }
}
