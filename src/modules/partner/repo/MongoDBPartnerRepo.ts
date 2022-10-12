import { DBProvider } from "../../../infraproviders/DBProvider";
import { Partner, PartnerProps } from "../domain/Partner";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IPartnerRepo } from "./PartnerRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { PartnerMapper } from "../mappers/PartnerMapper";

//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBPartnerRepo implements IPartnerRepo {
  private readonly partnerMapper: PartnerMapper;
  constructor(private readonly dbProvider: DBProvider) {
    this.partnerMapper = new PartnerMapper();
  }

  async getPartner(partnerId: string): Promise<Partner> {
    try {
      const partnerModel = await this.dbProvider.getPartnerModel();
      const result: any = await partnerModel.findById(partnerId).exec();
      const partnerData: PartnerProps = convertDBResponseToJsObject(result);
      return this.partnerMapper.toDomain(partnerData);
    } catch (e) {
      return null;
    }
  }

  async getPartnerFromApiKey(apiKey: string): Promise<Partner> {
    try {
      const partnerModel = await this.dbProvider.getPartnerModel();
      const result: any = await partnerModel
        .findOne({
          $or: [
            {
              apiKey: apiKey,
            },
            {
              apiKeyForEmbed: apiKey,
            },
          ],
        })
        .exec();
      if (!result) {
        throw new NotFoundException(`Partner with api key ${apiKey} not found`);
      }
      const partnerData: PartnerProps = convertDBResponseToJsObject(result);
      return this.partnerMapper.toDomain(partnerData);
    } catch (e) {
      throw new NotFoundException(`Partner with api key ${apiKey} not found`);
    }
  }

  async addPartner(partner: Partner): Promise<Partner> {
    try {
      const partnerModel = await this.dbProvider.getPartnerModel();
      const result = await partnerModel.create(partner.props);
      const partnerProps: PartnerProps = convertDBResponseToJsObject(result);
      return this.partnerMapper.toDomain(partnerProps);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async updatePartner(partner: Partner): Promise<Partner> {
    try {
      const partnerModel = await this.dbProvider.getPartnerModel();
      const result = await partnerModel
        .updateOne(
          { _id: partner.props._id },
          {
            $set: partner.props,
          },
        )
        .exec();
      const updatedPartner = await this.getPartner(partner.props._id);
      return updatedPartner;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
