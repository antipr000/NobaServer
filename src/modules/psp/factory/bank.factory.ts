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

  getBankImplementationByCurrency(currency: string): IBankImpl {
    switch (currency) {
      case "USD": // Should we be calling other
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
