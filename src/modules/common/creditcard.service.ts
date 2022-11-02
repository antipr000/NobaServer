import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { creditCardMaskGenerator } from "../../core/utils/CreditCardMaskGenerator";
import { CreditCardBinData } from "./domain/CreditCardBinData";
import { CreditCardDTO, BINValidity, BINReportDetails } from "./dto/CreditCardDTO";
import { CreditCardBinDataRepo } from "./repo/CreditCardBinDataRepo";

@Injectable()
export class CreditCardService {
  @Inject("CreditCardBinDataRepo")
  private readonly creditCardBinDataRepo: CreditCardBinDataRepo;

  async addOrUpdateBinData(binData: CreditCardDTO): Promise<CreditCardDTO> {
    if (await this.getBINDetails(binData.bin)) {
      return this.updateBinData(binData);
    } else {
      return this.addBinData(binData);
    }
  }

  async addBinData(binData: CreditCardDTO): Promise<CreditCardDTO> {
    if (await this.creditCardBinDataRepo.findCardByExactBIN(binData.bin)) {
      throw new BadRequestException("BIN already exists");
    }

    binData.mask = creditCardMaskGenerator(binData.bin, binData.digits);
    const creditCardBinData = await this.creditCardBinDataRepo.add(
      CreditCardBinData.createCreditCardBinDataObject(binData),
    );

    if (creditCardBinData === null) {
      throw new BadRequestException("Failed to add bin data");
    }
    return creditCardBinData.props;
  }

  async updateBinData(binData: CreditCardDTO): Promise<CreditCardDTO> {
    const creditCardBinData = await this.creditCardBinDataRepo.findCardByExactBIN(binData.bin);

    if (creditCardBinData === null) {
      throw new BadRequestException("Bin data not found!");
    }
    const updatedBinData = await this.creditCardBinDataRepo.update(
      CreditCardBinData.createCreditCardBinDataObject({
        ...creditCardBinData.props,
        ...binData,
      }),
    );

    if (updatedBinData === null) {
      throw new BadRequestException("Failed to update bin data");
    }
    return updatedBinData.props;
  }

  async getBINReport(): Promise<BINReportDetails> {
    return this.creditCardBinDataRepo.getBINReport();
  }

  async getBINDetails(requestedBIN: string): Promise<CreditCardDTO> {
    const binDetails: CreditCardBinData = await this.creditCardBinDataRepo.findCardByExactBIN(requestedBIN);
    if (!binDetails) return null;
    return binDetails.props;
  }

  async isBINSupported(checkBIN: string): Promise<BINValidity> {
    const bin = await this.getBINDetails(checkBIN);

    if (bin == null) {
      return BINValidity.UNKNOWN;
    }

    return bin.supported;
  }
}
