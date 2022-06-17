import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { MongoDBPartnerRepo } from "../repo/MongoDBPartnerRepo";
import { IPartnerRepo } from "../repo/PartnerRepo";

export function getMockPartnerRepoWithDefaults(): IPartnerRepo {
  const mockedPartnerRepo: IPartnerRepo = mock(MongoDBPartnerRepo);

  when(mockedPartnerRepo.addPartner(anything())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerRepo.getPartner(anyString())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerRepo.updatePartner(anything())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerRepo.updateTakeRate(anyString(), anyNumber())).thenReject(new Error("Not implemented!"));
  return mockedPartnerRepo;
}
