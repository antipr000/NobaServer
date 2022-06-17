import { mock, when, anything, anyString } from "ts-mockito";
import { MongoDBPartnerAdminRepo } from "../repo/MongoDBPartnerAdminRepo";
import { IPartnerAdminRepo } from "../repo/PartnerAdminRepo";

export function getMockPartnerAdminRepoWithDefaults(): IPartnerAdminRepo {
  const mockedPartnerAdminRepo: IPartnerAdminRepo = mock(MongoDBPartnerAdminRepo);

  when(mockedPartnerAdminRepo.addPartnerAdmin(anything())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerAdminRepo.getAllAdminsForPartner(anyString())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerAdminRepo.getPartnerAdmin(anyString())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerAdminRepo.getPartnerAdminUsingEmail(anyString())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerAdminRepo.removePartnerAdmin(anyString())).thenReject(new Error("Not implemented!"));
  when(mockedPartnerAdminRepo.updatePartnerAdmin(anything())).thenReject(new Error("Not implemented!"));
  return mockedPartnerAdminRepo;
}
