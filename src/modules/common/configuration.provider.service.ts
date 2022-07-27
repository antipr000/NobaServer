import { Injectable } from "@nestjs/common";
import { CommonConfigs } from "../../config/configtypes/CommonConfigs";
import { COMMON_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { ConfigurationsDTO } from "./dto/ConfigurationsDTO";

@Injectable()
export class ConfigurationProviderService {
  constructor(private readonly configService: CustomConfigService) {}

  getConfigurations(): ConfigurationsDTO {
    return {
      lowAmountThreshold: this.configService.get<CommonConfigs>(COMMON_CONFIG_KEY).lowAmountThreshold,
      highAmountThreshold: this.configService.get<CommonConfigs>(COMMON_CONFIG_KEY).highAmountThreshold,
      cryptoImageBaseUrl: this.configService.get<CommonConfigs>(COMMON_CONFIG_KEY).cryptoImageBaseUrl,
      fiatImagesBaseUrl: this.configService.get<CommonConfigs>(COMMON_CONFIG_KEY).fiatImageBaseUrl,
    };
  }
}
