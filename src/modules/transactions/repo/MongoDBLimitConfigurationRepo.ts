import { Injectable } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { LimitConfiguration, LimitConfigurationProps } from "../domain/LimitConfiguration";
import { ILimitConfigurationRepo } from "./LimitConfigurationRepo";

@Injectable()
export class MongoDBLimitConfigurationRepo implements ILimitConfigurationRepo {
  constructor(private readonly dbProvider: DBProvider) {}

  async getLimitConfig(id: any): Promise<LimitConfiguration> {
    const limitConfigModel = await this.dbProvider.getLimitConfigurationModel();
    const response = await limitConfigModel.findById(id).exec();
    if (!response) {
      return null;
    }
    const limitConfigProps: LimitConfigurationProps = convertDBResponseToJsObject(response);
    return LimitConfiguration.createLimitConfiguration(limitConfigProps);
  }

  async getAllLimitConfigs(): Promise<LimitConfiguration[]> {
    const limitConfigModel = await this.dbProvider.getLimitConfigurationModel();
    const response = await limitConfigModel.find({}).sort({ priority: -1 }).exec();
    const allLimitConfigProps: LimitConfigurationProps[] = convertDBResponseToJsObject(response);
    return allLimitConfigProps.map(limitConfigProps => LimitConfiguration.createLimitConfiguration(limitConfigProps));
  }

  async addLimitConfig(limitConfig: LimitConfiguration): Promise<LimitConfiguration> {
    const limitConfigModel = await this.dbProvider.getLimitConfigurationModel();
    const response = await limitConfigModel.create(limitConfig.props);
    const limitConfigProps: LimitConfigurationProps = convertDBResponseToJsObject(response);
    return LimitConfiguration.createLimitConfiguration(limitConfigProps);
  }
}
