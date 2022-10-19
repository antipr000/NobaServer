import { CreditCardBinData } from "../domain/CreditCardBinData";
import { BINReportDetails } from "../dto/CreditCardDTO";

export interface CreditCardBinDataRepo {
  add(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData>;
  update(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData>;
  deleteByID(id: string): Promise<void>;
  findByID(id: string): Promise<CreditCardBinData>;
  findCardByExactBIN(binPrefix: string): Promise<CreditCardBinData>;
  getBINReport(): Promise<BINReportDetails>;
}
