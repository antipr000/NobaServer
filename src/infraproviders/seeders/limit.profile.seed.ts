import { Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { COMMON_CONFIG_KEY, getEnvironmentName } from "../../config/ConfigurationUtils";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";
import { LimitProfile, LimitProfileProps, Limits } from "../../modules/transactions/domain/LimitProfile";
import { DBProvider } from "../DBProvider";
import { CommonConfigs } from "../../config/configtypes/CommonConfigs";

@Injectable()
export class LimitProfileSeeder {
  private readonly cardLimits: Limits;
  private readonly bankLimits: Limits;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    const appEnvironment = getEnvironmentName();
    const config = configService.get<CommonConfigs>(COMMON_CONFIG_KEY);
    this.cardLimits = {
      minTransaction: config.lowAmountThreshold,
      maxTransaction: config.highAmountThreshold,
      monthly: 2000,
    };

    this.bankLimits = {
      minTransaction: config.lowAmountThreshold,
      maxTransaction: config.highAmountThreshold,
      monthly: 2000,
    };
  }

  async seed() {
    const limitProfileModel = await this.dbProvider.getLimitProfileModel();
    try {
      const allLimitProfileRecords = await limitProfileModel.find({}).exec();
      const allLimitProfiles: LimitProfileProps[] = convertDBResponseToJsObject(allLimitProfileRecords);

      if (allLimitProfiles.length === 0) {
        console.log("Seeding limit profile");
        const limitProfile = LimitProfile.createLimitProfile({
          name: "Default Limit Profile",
          cardLimits: this.cardLimits,
          bankLimits: this.bankLimits,
        });
        await limitProfileModel.create(limitProfile.props);
      } else {
        console.log("Limit profile already seeded");
      }
    } catch (e) {}
  }
}
