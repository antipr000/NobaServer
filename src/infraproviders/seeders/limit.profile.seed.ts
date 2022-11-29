import { Injectable } from "@nestjs/common";
import { getEnvironmentName } from "../../config/ConfigurationUtils";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";
import { LimitProfile, LimitProfileProps, Limits } from "../../modules/transactions/domain/LimitProfile";
import { DBProvider } from "../DBProvider";
import {
  environmentToDefaultBankLimitsMap,
  environmentToDefaultCardLimitsMap,
  environmentToDefaultTransactionExposureMap,
} from "./data/default.limits.data";

@Injectable()
export class LimitProfileSeeder {
  private readonly cardLimits: Limits;
  private readonly bankLimits: Limits;
  private readonly unsettledExposure: number;
  constructor(private readonly dbProvider: DBProvider) {
    const appEnvironment = getEnvironmentName();
    this.cardLimits = environmentToDefaultCardLimitsMap[appEnvironment];

    this.bankLimits = environmentToDefaultBankLimitsMap[appEnvironment];

    this.unsettledExposure = environmentToDefaultTransactionExposureMap[appEnvironment];
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
