import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { BankName } from "../domain/BankFactoryTypes";
import { BankMonoImpl } from "./bank.mono.impl";
import { IBankImpl } from "./ibank.impl";

@Injectable()
export class BankFactory {
  @Inject()
  private readonly bankMonoImpl: BankMonoImpl;

  getBankImplementation(bankName: BankName): IBankImpl {
    switch (bankName) {
      case BankName.MONO:
        return this.bankMonoImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid bank name",
        });
    }
  }

  getBankImplementationByCurrency(currency: string): IBankImpl {
    switch (currency) {
      case "COP":
        return this.getBankImplementation(BankName.MONO);
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid currency",
        });
    }
  }
}
