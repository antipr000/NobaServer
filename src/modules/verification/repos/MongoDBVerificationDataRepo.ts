import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";
import { IVerificationDataRepo } from "./IVerificationDataRepo";

@Injectable()
export class MongoDBVerificationDataRepo implements IVerificationDataRepo {
  constructor(private readonly dbProvider: DBProvider) {}

  async saveVerificationData(verificationData: VerificationData): Promise<VerificationData> {
    try {
      const verificationModel = await this.dbProvider.getVerificationDataModel();
      const result = await verificationModel.create(verificationData.props);
      const verificationDataProps: VerificationDataProps = convertDBResponseToJsObject(result);
      return VerificationData.createVerificationData(verificationDataProps);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getVerificationData(id: string): Promise<VerificationData> {
    try {
      const verificationModel = await this.dbProvider.getVerificationDataModel();
      const result = await verificationModel.findById(id).exec();
      const verificationDataProps: VerificationDataProps = convertDBResponseToJsObject(result);
      return VerificationData.createVerificationData(verificationDataProps);
    } catch (e) {
      throw new NotFoundException();
    }
  }
}
