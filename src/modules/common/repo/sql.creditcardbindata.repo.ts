import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CreditCardBinData } from "../domain/CreditCardBinData";
import { CreditCardBinDataRepo } from "./creditcardbindata.repo";
import { BINReportDetails, BINValidity } from "../dto/CreditCardDTO";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { CreditCardBinDataRepoMapper } from "../mappers/CreditCardBinDataRepoMapper";
import { Prisma } from "@prisma/client";

@Injectable()
export class SQLCreditCardBinDataRepo implements CreditCardBinDataRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly repoMapper: CreditCardBinDataRepoMapper;

  constructor() {
    this.repoMapper = new CreditCardBinDataRepoMapper();
  }

  async add(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData> {
    try {
      const binDataInput: Prisma.CreditCardBINCreateInput = this.repoMapper.toBINDataCreateInput(creditCardBinData);
      const creditCardBinDataProps = await this.prismaService.creditCardBIN.create({ data: binDataInput });
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to create CreditCardBinData. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async update(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData> {
    try {
      const result = await this.prismaService.creditCardBIN.update({
        where: { id: creditCardBinData.props.id },
        data: this.repoMapper.toBINDataUpdateInput(creditCardBinData),
      });
      return CreditCardBinData.createCreditCardBinDataObject(result);
    } catch (e) {
      this.logger.error(`Failed to update CreditCardBinData. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async deleteByID(id: string): Promise<void> {
    try {
      await this.prismaService.creditCardBIN.delete({ where: { id: id } });
    } catch (e) {
      return null;
    }
  }

  async findByID(id: string): Promise<CreditCardBinData> {
    try {
      const creditCardBinDataProps = await this.prismaService.creditCardBIN.findUnique({ where: { id: id } });
      if (!creditCardBinDataProps) return null;
      return CreditCardBinData.createCreditCardBinDataObject(creditCardBinDataProps);
    } catch (e) {
      this.logger.error(`Failed to find CreditCardBinData with id ${id}. ${JSON.stringify(e)}`);
      return null;
    }
  }

  async findCardByExactBIN(bin: string): Promise<CreditCardBinData> {
    try {
      const result = await this.prismaService.creditCardBIN.findUnique({ where: { bin: bin } });
      if (!result) return null;
      return CreditCardBinData.createCreditCardBinDataObject(result);
    } catch (e) {
      this.logger.info(`Unknown BIN: ${bin}.`);
      return null;
    }
  }

  async getBINReport(): Promise<BINReportDetails> {
    const totalCountForUnsupportedSupportedBins = await this.prismaService.creditCardBIN.count({
      where: { supported: BINValidity.NOT_SUPPORTED },
    });

    const totalBins = await this.prismaService.creditCardBIN.count();

    return {
      supported: totalBins - totalCountForUnsupportedSupportedBins,
      unsupported: totalCountForUnsupportedSupportedBins,
    };
  }
}
