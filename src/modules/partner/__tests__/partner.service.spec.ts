import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { mockedPartnerRepo } from "../mocks/partnerrepomock";
import { mockPartner, updatePartnerName, updateTakeRate  } from "../../../core/tests/constants";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { IPartnerRepo } from "../repo/PartnerRepo";
import { CommonModule } from '../../common/common.module';

describe('PartnerService', () => {
    let partnerService: PartnerService;
    let partnerRepo: IPartnerRepo;

    jest.setTimeout(20000);
    const OLD_ENV = process.env;
  
    beforeEach(async () => {
     process.env = {
         ...OLD_ENV,
         NODE_ENV: "development",
         CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs"
     };
      const PartnerRepoProvider = {
        provide: IPartnerRepo,
        useFactory: () => instance(mockedPartnerRepo)
      };
      const app: TestingModule = await Test.createTestingModule({
        imports: [
            getWinstonModule(),
            getAppConfigModule(),
            CommonModule
        ],
        controllers: [],
        providers: [PartnerRepoProvider, PartnerService],
      }).compile();
  
      partnerService = app.get<PartnerService>(PartnerService);
      partnerRepo = app.get<IPartnerRepo>(IPartnerRepo);
    });
  
    describe('partner service tests', () => {

      it('should get partner given id', async() => {
          const result = await partnerService.getPartner(mockPartner._id);
          expect(result.props).toStrictEqual(mockPartner);
      });

      it('should update partner', async() => {
        const result = await partnerService.updatePartner(mockPartner._id, {
            ...mockPartner,
            name: updatePartnerName
        });
        expect(result.props).toStrictEqual({
            ...mockPartner,
            name: updatePartnerName
        });
    });

    it('should update take rate', async () => {
        const result = await partnerService.updateTakeRate(mockPartner._id, updateTakeRate);
        expect(result.props).toStrictEqual({
            ...mockPartner,
            takeRate: updateTakeRate
        });
    });

    });

    
    
});