import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when, deepEqual } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerRepoWithDefaults } from "../mocks/mock.partner.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Partner } from "../domain/Partner";
import { WebhookType } from "../domain/WebhookTypes";

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
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
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
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerRepo.addPartner(anything())).thenResolve(partner);

      const result = await partnerService.createPartner(partner.props.name);
      expect(result).toStrictEqual(partner);
    });

    it("should get partner given id", async () => {
      const partner: Partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      const result = await partnerService.getPartner(partner.props._id);
      expect(result).toStrictEqual(partner);
    });

    it("should update partner", async () => {
      const partner: Partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const updatedPartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "New Partner Name",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
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
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const newTakeRate = 20;
      const updatePartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        takeRate: newTakeRate,
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatePartner))).thenResolve(updatePartner);

      const result = await partnerService.updatePartner(partner.props._id, {
        takeRate: newTakeRate,
      });
      expect(result).toStrictEqual(updatePartner);
    });

    it("should populate the webhook Client ID and secret if null when adding a webhook", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      const webhookType = WebhookType.TRANSACTION_CONFIRM;
      const webhookURL = "http://partner.com/path";

      const updatedPartner = Partner.createPartner({
        ...partner.props,
        webhookClientID: "12345",
        webhookSecret: "67890",
        webhooks: [{ type: webhookType, url: webhookURL }],
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);

      const result = await partnerService.addOrReplaceWebhook(partner.props._id, webhookType, webhookURL);
      expect(result).toStrictEqual(updatedPartner);
    });

    it("should add a new webhook", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
      });

      const webhookType = WebhookType.TRANSACTION_CONFIRM;
      const webhookURL = "http://partner.com/path";

      const updatedPartner = Partner.createPartner({
        ...partner.props,
        webhooks: [{ type: webhookType, url: webhookURL }],
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);

      const result = await partnerService.addOrReplaceWebhook(partner.props._id, webhookType, webhookURL);
      expect(result).toStrictEqual(updatedPartner);
    });

    it("should overwrite an existing webhook", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
        webhooks: [{ type: WebhookType.TRANSACTION_CONFIRM, url: "OldURL" }],
      });

      const webhookType = WebhookType.TRANSACTION_CONFIRM;
      const webhookURL = "http://partner.com/path";

      const updatedPartner = Partner.createPartner({
        ...partner.props,
        webhooks: [{ type: webhookType, url: webhookURL }],
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);

      const result = await partnerService.addOrReplaceWebhook(partner.props._id, webhookType, webhookURL);
      expect(result).toStrictEqual(updatedPartner);
    });
  });
});
