import { Injectable } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { LimitProfile, LimitProfileProps } from "../domain/LimitProfile";
import { ILimitProfileRepo } from "./LimitProfileRepo";

@Injectable()
export class MongoDBLimitProfileRepo implements ILimitProfileRepo {
  constructor(private readonly dbProvider: DBProvider) {}

  async getProfile(id: string): Promise<LimitProfile> {
    const limitProfileModel = await this.dbProvider.getLimitProfileModel();
    const response = await limitProfileModel.findById(id).exec();
    if (!response) {
      return null;
    }
    const limitProfileProps: LimitProfileProps = convertDBResponseToJsObject(response);
    return LimitProfile.createLimitProfile(limitProfileProps);
  }

  async addProfile(limitProfile: LimitProfile): Promise<LimitProfile> {
    const limitProfileModel = await this.dbProvider.getLimitProfileModel();
    const response = await limitProfileModel.create(limitProfile.props);
    const limitProfileProps: LimitProfileProps = convertDBResponseToJsObject(response);
    return LimitProfile.createLimitProfile(limitProfileProps);
  }
}
