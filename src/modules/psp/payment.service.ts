import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BankFactory } from "./factory/bank.factory";
import { BankName } from "./domain/BankFactoryTypes";
import { BalanceDTO } from "./dto/balance.dto";
import { IBalanceProvider } from "./factory/ibalanceprovider";

@Injectable()
export class PaymentService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly bankFactory: BankFactory;

  async getBalance(bankName: BankName, accountID: string): Promise<BalanceDTO> {
    const balanceProvider: IBalanceProvider = this.bankFactory.getBankImplementation(bankName);
    try {
      return await balanceProvider.getBalance(accountID);
    } catch (e) {
      return { balance: null, currency: null };
    }
  }
}
