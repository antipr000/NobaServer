import { CreditCardBinData } from "../domain/CreditCardBinData";
import { BINReportDetails } from "../dto/CreditCardDTO";

export interface CreditCardBinDataRepo {
  add(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData>;
  update(creditCardBinData: CreditCardBinData): Promise<CreditCardBinData>;
  deleteByID(id: string): Promise<void>;
  findByID(id: string): Promise<CreditCardBinData>;
  findCardByBINPrefix(binPrefix: string): Promise<CreditCardBinData>;
  findAll(): Promise<Array<CreditCardBinData>>;
  getBINReport(): Promise<BINReportDetails>;
}
