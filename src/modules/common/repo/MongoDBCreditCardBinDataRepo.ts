import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Logger } from "winston";
import { CreditCardBinData, CreditCardBinDataProps } from "../domain/CreditCardBinData";
import { CreditCardBinDataRepo } from "./CreditCardBinDataRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { BINReportDetails, BINValidity } from "../dto/CreditCardDTO";

@Injectable()
export class MongoDBCreditCardBinDataRepo implements CreditCardBinDataRepo {
  @Inject()
  private readonly dbProvider: DBProvider;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  async add(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData> {
    try {
      const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
      const result = await creditCardBinDataModel.create(creditCardBinData.props);
      const creditCardBinDataProps: CreditCardBinDataProps = convertDBResponseToJsObject(result);
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to create CreditCardBinData. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async update(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData> {
    try {
      const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
      const result = await creditCardBinDataModel
        .findByIdAndUpdate(
          creditCardBinData.props._id,
          {
            $set: creditCardBinData.props,
          },
          {
            new: true,
          },
        )
        .exec();
      const creditCardBinDataProps: CreditCardBinDataProps = convertDBResponseToJsObject(result);
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to update CreditCardBinData. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async deleteByID(id: string): Promise<void> {
    try {
      const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
      await creditCardBinDataModel.findByIdAndDelete(id);
    } catch (e) {
      this.logger.error(`Failed to delete CreditCardBinData. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async findByID(id: string): Promise<CreditCardBinData> {
    try {
      const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
      const result = await creditCardBinDataModel.findById(id).exec();
      const creditCardBinDataProps: CreditCardBinDataProps = convertDBResponseToJsObject(result);
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to find CreditCardBinData with id ${id}. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async findCardByBINPrefix(binPrefix: string): Promise<CreditCardBinData> {
    try {
      const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
      const result = await creditCardBinDataModel.findOne({ bin: { $regex: `^${binPrefix}` } });
      const creditCardBinDataProps: CreditCardBinDataProps = convertDBResponseToJsObject(result);
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to find CreditCardBinData with iin ${binPrefix}. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async findAll(): Promise<Array<CreditCardBinData>> {
    throw new Error("Not implemented");
  }

  async getBINReport(): Promise<BINReportDetails> {
    const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
    const totalCountForUnsupportedSupportedBins = await creditCardBinDataModel
      .count({
        supported: BINValidity.NOT_SUPPORTED,
      })
      .exec();

    const totalBins = await creditCardBinDataModel.count().exec();

    return {
      supported: totalBins - totalCountForUnsupportedSupportedBins,
      unsupported: totalCountForUnsupportedSupportedBins,
    };
  }
}