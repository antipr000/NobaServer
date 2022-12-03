import { Circle, CircleEnvironments } from "@circle-fin/circle-sdk";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CircleConfigs } from "../../config/configtypes/CircleConfigs";
import { CIRCLE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";

export class CircleClient {
  private readonly circleApi: Circle;
  private readonly masterWalletID: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const circleConfigs: CircleConfigs = configService.get<CircleConfigs>(CIRCLE_CONFIG_KEY);
    this.circleApi = new Circle(circleConfigs.apiKey, CircleEnvironments[circleConfigs.env]);
    this.masterWalletID = circleConfigs.masterWalletID;
  }
}
