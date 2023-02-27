import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { IBalanceProviderImpl } from "./ibalanceProvider.impl";
import { ACCOUNT_BALANCE_TYPES } from "../domain/Admin";
import { MonoBalanceProviderImpl } from "./mono.balanceprovider.impl";

@Injectable()
export class BalanceProviderFactory {
  @Inject()
  private readonly monoBalanceProviderImpl: MonoBalanceProviderImpl;

  getBalanceProviderImplementation(accountType: ACCOUNT_BALANCE_TYPES): IBalanceProviderImpl {
    switch (accountType) {
      case ACCOUNT_BALANCE_TYPES.MONO:
        return this.monoBalanceProviderImpl;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid balance provider name",
        });
    }
  }
}
