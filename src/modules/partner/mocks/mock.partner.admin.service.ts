import { anyString, anything, mock, when } from "ts-mockito";
import { PartnerAdminService } from "../partneradmin.service";

export const getMockPartnerAdminServiceWithDefaults = () => {
  const mockPartnerAdminService: PartnerAdminService = mock(PartnerAdminService);

  when(mockPartnerAdminService.addAdminForPartner(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockPartnerAdminService.deleteAdminForPartner(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockPartnerAdminService.getAllPartnerAdmins(anything())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAdminService.getAllTransactionsForPartner(anything())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAdminService.getAllConsumersForPartner(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAdminService.getPartnerAdmin(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAdminService.getPartnerAdminFromEmail(anyString())).thenReject(new Error("Not implemented!"));
  when(mockPartnerAdminService.addAdminForPartner(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );

  return mockPartnerAdminService;
};
