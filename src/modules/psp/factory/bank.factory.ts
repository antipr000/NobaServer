import { Inject, Injectable } from "@nestjs/common";
import { CircleService } from "../../../modules/circle/public/circle.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { BankName } from "../domain/BankFactoryTypes";
import { IBank } from "./ibank";
import { MonoService } from "../../../modules/mono/public/mono.service";

@Injectable()
export class BankFactory {
  @Inject()
  private readonly monoService: MonoService;

  @Inject()
  private readonly circleService: CircleService;

  getBankImplementation(bankName: BankName): IBank {
    switch (bankName) {
      case BankName.MONO:
        return this.monoService;
      case BankName.CIRCLE:
        return this.circleService;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported bank",
        });
    }
  }

  getBankImplementationByCurrency(currency: string): IBank {
    switch (currency) {
      case "USD":
        return this.circleService;
      case "COP":
        return this.monoService;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported bank for currency",
        });
    }
  }
}
