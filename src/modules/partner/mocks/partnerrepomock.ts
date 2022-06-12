/* eslint-disable @typescript-eslint/no-unused-vars */
import { mock, when, deepEqual, anything } from "ts-mockito";
import { MongoDBPartnerRepo } from "../repo/MongoDBPartnerRepo";
import { IPartnerRepo } from "../repo/PartnerRepo";
import { mockPartner, updatePartnerName, updateTakeRate } from "../../../core/tests/constants";
import { Partner } from "../domain/Partner";

const mockedPartnerRepo: IPartnerRepo = mock(MongoDBPartnerRepo);
const partner = Partner.createPartner(mockPartner);
const updatePartner = Partner.createPartner({
  ...mockPartner,
  name: updatePartnerName,
});

when(mockedPartnerRepo.addPartner(anything())).thenReturn(
  new Promise((resolve, _) => {
    resolve(partner);
  }),
);

when(mockedPartnerRepo.getPartner(mockPartner._id)).thenReturn(
  new Promise((resolve, _) => {
    resolve(partner);
  }),
);

when(mockedPartnerRepo.updatePartner(deepEqual(updatePartner))).thenReturn(
  new Promise((resolve, _) => {
    resolve(updatePartner);
  }),
);

when(mockedPartnerRepo.updateTakeRate(mockPartner._id, deepEqual(updateTakeRate))).thenReturn(
  new Promise((resolve, _) => {
    resolve(
      Partner.createPartner({
        ...mockPartner,
        takeRate: updateTakeRate,
      }),
    );
  }),
);

export { mockedPartnerRepo };
