import { Injectable } from "@nestjs/common";
import { LimitConfiguration, LimitConfigurationProps } from "../../modules/transactions/domain/LimitConfiguration";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";
import { LimitProfileProps } from "../../modules/transactions/domain/LimitProfile";
import { DBProvider } from "../DBProvider";

@Injectable()
export class LimitConfigSeeder {
  constructor(private readonly dbProvider: DBProvider) {}

  async seed() {
    const limitProfileModel = await this.dbProvider.getLimitProfileModel();
    const limitConfigModel = await this.dbProvider.getLimitConfigurationModel();
    try {
      const allLimitProfileRecords = await limitProfileModel.find({}).exec();
      const allLimitProfiles: LimitProfileProps[] = convertDBResponseToJsObject(allLimitProfileRecords);

      const allLimitConfigs: LimitConfigurationProps[] = convertDBResponseToJsObject(
        await limitConfigModel.find({}).exec(),
      );

      if (allLimitConfigs.length === 0) {
        console.log("Adding default limit configuration");
        const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
          isDefault: true,
          priority: 1,
          profile: allLimitProfiles[0]._id,
          criteria: {},
        });
        await limitConfigModel.create(defaultLimitConfiguration.props);
      }
    } catch (e) {}
  }
}
