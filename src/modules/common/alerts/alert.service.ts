import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { NobaConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { Logger } from "winston";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Alert } from "./alert.dto";

@Injectable()
export class AlertService {
  private environment: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    this.environment = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).environment;
  }

  raiseCriticalAlert(alert: Alert): void {
    this.logger.error(`[${this.environment}] [CRITICAL] ${JSON.stringify(alert)}`);
  }

  raiseError(message: string): void {
    this.logger.error(`[${this.environment}] [ERROR] ${message}`);
  }
}
