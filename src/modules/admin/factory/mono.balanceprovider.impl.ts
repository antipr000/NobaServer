import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoService } from "../../psp/mono/mono.service";
import { IBalanceProviderImpl } from "./ibalanceProvider.impl";

export class MonoBalanceProviderImpl implements IBalanceProviderImpl {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoService: MonoService,
  ) {}

  async getBalance(accountID: string): Promise<number> {
    return 1;
  }
}
