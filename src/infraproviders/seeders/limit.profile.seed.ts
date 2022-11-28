import { Injectable } from "@nestjs/common";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";
import { LimitProfile, LimitProfileProps, Limits } from "../../modules/transactions/domain/LimitProfile";
import { DBProvider } from "../DBProvider";

@Injectable()
export class LimitProfileSeeder {
  private readonly cardLimits: Limits;
  private readonly bankLimits: Limits;
  private readonly unsettledExposure: number;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    const nobaConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY);
    this.cardLimits = {
      minTransaction: nobaConfigs.transaction.cardMinTransactionLimit,
      maxTransaction: nobaConfigs.transaction.cardMaxTransactionLimit,
      daily: nobaConfigs.transaction.cardDailyLimit,
      weekly: nobaConfigs.transaction.cardWeeklyLimit,
      monthly: nobaConfigs.transaction.cardMonthlyLimit,
    };

    this.bankLimits = {
      minTransaction: nobaConfigs.transaction.bankMinTransactionLimit,
      maxTransaction: nobaConfigs.transaction.bankMaxTransactionLimit,
      daily: nobaConfigs.transaction.bankDailyLimit,
      weekly: nobaConfigs.transaction.bankWeeklyLimit,
      monthly: nobaConfigs.transaction.bankMonthlyLimit,
    };

    this.unsettledExposure = nobaConfigs.transaction.unsettledExposure;
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
          unsettledExposure: this.unsettledExposure,
        });
        await limitProfileModel.create(limitProfile.props);
      } else {
        console.log("Limit profile already seeded");
      }
    } catch (e) {}
  }
}
