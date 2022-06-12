import { DBProvider } from "../../../infraproviders/DBProvider";
import { PartnerAdmin, PartnerAdminProps } from "../domain/PartnerAdmin";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IPartnerAdminRepo } from "./PartnerAdminRepo";
import { Result } from "../../../core/logic/Result";
import { PartnerAdminMapper } from "../mappers/PartnerAdminMapper";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";

//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBPartnerAdminRepo implements IPartnerAdminRepo {
  private readonly partnerAdminMapper: PartnerAdminMapper;

  constructor(private readonly dbProvider: DBProvider) {
    this.partnerAdminMapper = new PartnerAdminMapper();
  }

  async getPartnerAdmin(partnerAdminId: string): Promise<Result<PartnerAdmin>> {
    try {
      const result: any = await this.dbProvider.partnerAdminModel.findById(partnerAdminId).exec();
      const partnerAdminProps: PartnerAdminProps = convertDBResponseToJsObject(result);
      return Result.ok(this.partnerAdminMapper.toDomain(partnerAdminProps));
    } catch (e) {
      return Result.fail("Could not find admin in db");
    }
  }

  async getPartnerAdminUsingEmail(emailID: string): Promise<Result<PartnerAdmin>> {
    try {
      const result: any = await this.dbProvider.partnerAdminModel.findOne({ email: emailID }).exec();
      const partnerAdminProps: PartnerAdminProps = convertDBResponseToJsObject(result);
      return Result.ok(this.partnerAdminMapper.toDomain(partnerAdminProps));
    } catch (e) {
      return Result.fail("Could not find admin with given email in db");
    }
  }

  async addPartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin> {
    const getResult = await this.getPartnerAdminUsingEmail(partnerAdmin.props.email);
    if (getResult.isSuccess) throw new BadRequestException("Admin with given email already exists");
    else {
      try {
        const result: any = await this.dbProvider.partnerAdminModel.create(partnerAdmin.props);
        const partnerAdminProps: PartnerAdminProps = convertDBResponseToJsObject(result);
        return this.partnerAdminMapper.toDomain(partnerAdminProps);
      } catch (e) {
        throw new BadRequestException(e.message);
      }
    }
  }
  async getAllAdminsForPartner(partnerId: string): Promise<PartnerAdmin[]> {
    const result: any = await this.dbProvider.partnerAdminModel.find({ partnerId: partnerId }).exec();
    const partnerAdmins: PartnerAdmin[] = convertDBResponseToJsObject(result);
    return partnerAdmins.map(partnerAdmin => this.partnerAdminMapper.toDomain(partnerAdmin));
  }
  async removePartnerAdmin(partnerAdminId: string): Promise<void> {
    try {
      await this.dbProvider.partnerModel.findByIdAndDelete(partnerAdminId).exec();
    } catch (e) {
      throw new NotFoundException(e.message);
    }
  }

  async updatePartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin> {
    try {
      const result = await this.dbProvider.partnerAdminModel
        .updateOne(
          { _id: partnerAdmin.props._id },
          {
            $set: partnerAdmin.props,
          },
        )
        .exec();
      const partnerAdminProps: PartnerAdminProps = convertDBResponseToJsObject(result);
      return this.partnerAdminMapper.toDomain(partnerAdminProps);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
