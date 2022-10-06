import { Inject, Injectable } from "@nestjs/common";
import { CreditCardBinData } from "./domain/CreditCardBinData";
import { CreditCardDTO, BINValidity, BINReportDetails } from "./dto/CreditCardDTO";
import { CreditCardBinDataRepo } from "./repo/CreditCardBinDataRepo";

@Injectable()
export class CreditCardService {
  @Inject("CreditCardBinDataRepo")
  private readonly creditCardBinDataRepo: CreditCardBinDataRepo;

  async getBINReport(): Promise<BINReportDetails> {
    return this.creditCardBinDataRepo.getBINReport();
  }

  async getBINDetails(requestedBIN: string): Promise<CreditCardDTO> {
    const binDetails: CreditCardBinData = await this.creditCardBinDataRepo.findCardByBINPrefix(requestedBIN);
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
