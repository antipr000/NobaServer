import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { BankName } from "../domain/BankFactoryTypes";
import { BankCircleImpl } from "./bank.circle.impl";
import { BankMonoImpl } from "./bank.mono.impl";
import { IBankImpl } from "./ibank.impl";

@Injectable()
export class BankFactory {
  @Inject()
  private readonly bankMonoImpl: BankMonoImpl;

  private readonly bankCircleImpl: BankCircleImpl;

  getBankImplementation(bankName: BankName): IBankImpl {
    switch (bankName) {
      case BankName.MONO:
        return this.bankMonoImpl;
      case BankName.CIRCLE:
        return this.bankCircleImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported bank",
        });
    }
  }

  getBankImplementationByCurrency(currency: string): IBankImpl {
    switch (currency) {
      case "USD":
        return this.bankCircleImpl;
      case "COP":
        return this.bankMonoImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported bank for currency",
        });
    }
  }
}
