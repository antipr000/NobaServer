import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MonoConfigs } from "../../../config/configtypes/MonoConfig";
import { MONO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { BalanceDTO } from "../../../modules/psp/dto/balance.dto";
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoAccountBalance } from "../dto/mono.workflow.service.dto";
import { MonoService } from "../public/mono.service";

@Injectable()
export class MonoWorkflowService {
  private monoConfigs: MonoConfigs;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoService: MonoService,
    customConfigService: CustomConfigService,
  ) {
    this.monoConfigs = customConfigService.get<MonoConfigs>(MONO_CONFIG_KEY);
  }

  async getNobaMonoAccountBalance(): Promise<MonoAccountBalance> {
    const nobaBalance: BalanceDTO = await this.monoService.getBalance(this.monoConfigs.nobaAccountID);
    return {
      accountID: this.monoConfigs.nobaAccountID,
      amount: nobaBalance.balance,
      currency: nobaBalance.currency,
    };
  }
}
