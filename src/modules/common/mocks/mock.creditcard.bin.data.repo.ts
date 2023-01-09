import { anyString, anything, mock, when } from "ts-mockito";
import { CreditCardBinDataRepo } from "../repo/credit.card.bin.data.repo";
import { SQLCreditCardBinDataRepo } from "../repo/sql.credit.card.bin.data.repo";

export function getMockCreditCardBinDataRepoMockWithDefaults(): CreditCardBinDataRepo {
  const mockCreditCardBinDataRepo = mock(SQLCreditCardBinDataRepo);

  when(mockCreditCardBinDataRepo.add(anything())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.deleteByID(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.findByID(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.update(anything())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.findCardByExactBIN(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.getBINReport()).thenReject(new Error("Not implemented!"));

  return mockCreditCardBinDataRepo;
}
