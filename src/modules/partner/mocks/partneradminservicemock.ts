import { mock, when, deepEqual, anything } from "ts-mockito";
import { PartnerAdminService } from "../partneradmin.service";
import { 
    mockPartnerAdminWithAllAccess, 
    mockPartnerAdminWithBasicAccess, 
    mockPartnerAdminWithIntermediateAccess,
    mockFailureEmailAddress } from "../../../core/tests/constants";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { NotFoundException } from "@nestjs/common";

const mockedPartnerAdminService = mock(PartnerAdminService);
const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);

when(mockedPartnerAdminService.addPartnerAdmin(
    mockPartnerAdminWithAllAccess.partnerId, mockPartnerAdminWithAllAccess.email))
    .thenReturn(new Promise((resolve, _) => {
        resolve(partnerAdmin)
    }));

when(mockedPartnerAdminService.getPartnerAdmin(mockPartnerAdminWithAllAccess._id))
    .thenReturn(new Promise((resolve, _) => {
        resolve(partnerAdmin);
    }));

when(mockedPartnerAdminService.getPartnerAdmin(mockPartnerAdminWithBasicAccess._id))
    .thenReturn(new Promise((resolve, _) => {
        resolve(PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess));
    }));

when(mockedPartnerAdminService.getPartnerAdmin(mockPartnerAdminWithIntermediateAccess._id))
    .thenReturn(new Promise((resolve, _) => {
        resolve(PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess));
    }));

when(mockedPartnerAdminService.getAllPartnerAdmins(mockPartnerAdminWithAllAccess.partnerId))
    .thenReturn(new Promise((resolve, _) => {
        resolve([
            partnerAdmin,
            PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess),
            PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess)
        ]);
    }));

when(mockedPartnerAdminService.getPartnerAdminFromEmail(mockFailureEmailAddress))
    .thenReturn(new Promise((_, reject) => {
        reject(new NotFoundException("Admin not found"))
    }));

when(mockedPartnerAdminService.getPartnerAdminFromEmail(mockPartnerAdminWithAllAccess.email))
    .thenReturn(new Promise((resolve, _) => {
        resolve(partnerAdmin);
    }));

export {
    mockedPartnerAdminService
};