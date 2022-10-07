import { anyString, anything, mock, when } from "ts-mockito";
import { CreditCardBinDataRepo } from "../repo/CreditCardBinDataRepo";
import { MongoDBCreditCardBinDataRepo } from "../repo/MongoDBCreditCardBinDataRepo";

export function getMockCreditCardBinDataRepoMockWithDefaults(): CreditCardBinDataRepo {
  const mockCreditCardBinDataRepo = mock(MongoDBCreditCardBinDataRepo);

  when(mockCreditCardBinDataRepo.add(anything())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.deleteByID(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.findByID(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.findAll()).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.update(anything())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.findCardByBINPrefix(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardBinDataRepo.getBINReport()).thenReject(new Error("Not implemented!"));

  return mockCreditCardBinDataRepo;
}
