import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { CircleService } from "../circle.service";
import { BankName } from "../domain/BankFactoryTypes";
import { MonoWorkflowService } from "../mono/mono.workflow.service";
import { IBank } from "./ibank";

@Injectable()
export class BankFactory {
  @Inject()
  private readonly monoWorkflowService: MonoWorkflowService;

  @Inject()
  private readonly circleService: CircleService;

  getBankImplementation(bankName: BankName): IBank {
    switch (bankName) {
      case BankName.MONO:
        return this.monoWorkflowService;
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
        return this.monoWorkflowService;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "No supported bank for currency",
        });
    }
  }
}
