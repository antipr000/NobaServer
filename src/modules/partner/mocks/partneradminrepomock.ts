/* eslint-disable @typescript-eslint/no-unused-vars */
import { mock, when, deepEqual, anything } from "ts-mockito";
import { MongoDBPartnerAdminRepo } from "../repo/MongoDBPartnerAdminRepo";
import { IPartnerAdminRepo } from "../repo/PartnerAdminRepo";
import {
  mockPartnerAdminWithAllAccess,
  mockPartnerAdminWithBasicAccess,
  mockPartnerAdminWithIntermediateAccess,
  mockFailureEmailAddress,
} from "../../../core/tests/constants";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { Result } from "../../../core/logic/Result";

const mockedPartnerAdminRepo: IPartnerAdminRepo = mock(MongoDBPartnerAdminRepo);
const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);

when(mockedPartnerAdminRepo.addPartnerAdmin(anything())).thenReturn(
  new Promise((resolve, _) => {
    resolve(partnerAdmin);
  }),
);

when(mockedPartnerAdminRepo.getAllAdminsForPartner(partnerAdmin.props.partnerId)).thenReturn(
  new Promise((resolve, _) => {
    resolve([
      partnerAdmin,
      PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess),
      PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess),
    ]);
  }),
);

when(mockedPartnerAdminRepo.getPartnerAdmin(partnerAdmin.props._id)).thenReturn(
  new Promise((resolve, _) => {
    resolve(Result.ok(partnerAdmin));
  }),
);

when(mockedPartnerAdminRepo.getPartnerAdminUsingEmail(partnerAdmin.props.email)).thenReturn(
  new Promise((resolve, _) => {
    resolve(Result.ok(partnerAdmin));
  }),
);

when(mockedPartnerAdminRepo.getPartnerAdminUsingEmail(mockFailureEmailAddress)).thenReturn(
  new Promise((resolve, _) => {
    resolve(Result.fail("Could not find admin with given email"));
  }),
);

when(mockedPartnerAdminRepo.removePartnerAdmin(partnerAdmin.props._id)).thenReturn(
  new Promise((resolve, _) => {
    resolve();
  }),
);

when(
  mockedPartnerAdminRepo.updatePartnerAdmin(
    deepEqual(
      PartnerAdmin.createPartnerAdmin({
        ...mockPartnerAdminWithAllAccess,
        name: mockPartnerAdminWithBasicAccess.name,
      }),
    ),
  ),
).thenReturn(
  new Promise((resolve, _) => {
    resolve(
      PartnerAdmin.createPartnerAdmin({
        ...mockPartnerAdminWithAllAccess,
        name: mockPartnerAdminWithBasicAccess.name,
      }),
    );
  }),
);

export { mockedPartnerAdminRepo };
