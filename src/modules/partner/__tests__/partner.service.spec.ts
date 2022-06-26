import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when, deepEqual } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerRepoWithDefaults } from "../mocks/mock.partner.repo";
import { getTestWinstonModule, getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule, TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CommonModule } from "../../common/common.module";
import { Partner } from "../domain/Partner";

describe("PartnerService", () => {
  let partnerService: PartnerService;

  const partnerRepo = getMockPartnerRepoWithDefaults();

  jest.setTimeout(20000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    const PartnerRepoProvider = {
      provide: "PartnerRepo",
      useFactory: () => instance(partnerRepo),
    };
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({}),
        getTestWinstonModule()
      ],
      controllers: [],
      providers: [PartnerRepoProvider, PartnerService],
    }).compile();

    partnerService = app.get<PartnerService>(PartnerService);
  });

  describe("partner service tests", () => {
    it("should add a new partner", async () => {
      const partner: Partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });

      when(partnerRepo.addPartner(anything())).thenResolve(partner);

      const result = await partnerService.createPartner(partner.props.name);
      expect(result).toStrictEqual(partner);
    });

    it("should get partner given id", async () => {
      const partner: Partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      const result = await partnerService.getPartner(partner.props._id);
      expect(result).toStrictEqual(partner);
    });

    it("should update partner", async () => {
      const partner: Partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const updatedPartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "New Partner Name",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });

      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);
      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);

      const result = await partnerService.updatePartner(partner.props._id, {
        name: updatedPartner.props.name,
      });
      expect(result.props).toStrictEqual(updatedPartner.props);
    });

    it("should update take rate", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const newTakeRate = 20;
      const updatePartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
        takeRate: newTakeRate,
      });

      when(partnerRepo.updatePartner(deepEqual(updatePartner))).thenResolve(updatePartner);

      const result = await partnerService.updatePartner(partner.props._id, {
        takeRate: newTakeRate,
      });
      expect(result).toStrictEqual(updatePartner);
    });
  });
});
