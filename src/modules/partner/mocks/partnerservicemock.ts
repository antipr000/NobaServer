import { when } from "ts-mockito";
import { mock } from "ts-mockito";
import { mockPartner, updateTakeRate } from "../../../core/tests/constants";
import { Partner } from "../domain/Partner";
import { PartnerService } from "../partner.service";


const mockedPartnerService = mock(PartnerService);
const partner = Partner.createPartner(mockPartner);

when(mockedPartnerService.getPartner(mockPartner._id))
    .thenReturn(new Promise((resolve, _) => {
        resolve(partner);
    }));

when(mockedPartnerService.updateTakeRate(mockPartner._id, updateTakeRate))
    .thenReturn(new Promise((resolve, _) => {
        resolve(Partner.createPartner({
            ...mockPartner,
            takeRate: updateTakeRate
        }));
    }));

export {
    mockedPartnerService
};
