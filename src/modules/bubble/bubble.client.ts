import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BubbleConfigs } from "src/config/configtypes/BubbleConfigs";
import { BUBBLE_CONFIG_KEY } from "src/config/ConfigurationUtils";
import { CustomConfigService } from "src/core/utils/AppConfigModule";
import { Logger } from "winston";

@Injectable()
export class BubbleClient {
  private bearerToken: string;
  private baseUrl: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const bubbleConfigs: BubbleConfigs = configService.get<BubbleConfigs>(BUBBLE_CONFIG_KEY);
    this.bearerToken = bubbleConfigs.bearerToken;
    this.baseUrl = bubbleConfigs.baseURL;
  }
}
