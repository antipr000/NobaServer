import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when, deepEqual, capture } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerRepoWithDefaults } from "../mocks/mock.partner.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Partner } from "../domain/Partner";
import { WebhookType } from "../domain/WebhookTypes";
import { BadRequestException } from "@nestjs/common";
import { IPartnerRepo } from "../repo/PartnerRepo";

describe("PartnerService", () => {
  let partnerService: PartnerService;
  let partnerRepo: IPartnerRepo;

  jest.setTimeout(20000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    partnerRepo = getMockPartnerRepoWithDefaults();

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

  describe("CreatePartner", () => {
    it("should throw BadRequestException if 'name' is missing", async () => {
      try {
        await partnerService.createPartner({
          takeRate: 10,
          allowedCryptoCurrencies: ["ETH", "USDC"],
        } as any);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should save default values of the non-required parameters", async () => {
      const partnerName: string = "partner name";
      const allowedCryptoCurrencies = ["ETH", "USDC"];
      const takeRate = 10;

      const partner = Partner.createPartner({
        name: partnerName,
        config: {
          cryptocurrencyAllowList: allowedCryptoCurrencies,
          viewOtherWallets: true,
          privateWallets: false,
          bypassLogonOTP: false,
          bypassWalletOTP: false,
          fees: {
            creditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
            spreadDiscountPercent: 0,
            takeRate: takeRate,
          },
        },
      });
      when(partnerRepo.addPartner(anything())).thenResolve(partner);

      // There are 2 things to check here
      //   - What is the parameters passed to the DB Layer?
      //   - Whether there is any diffs between the response from DB Layer vs returend response?
      const savedPartner: Partner = await partnerService.createPartner({
        name: partnerName,
        allowedCryptoCurrencies: allowedCryptoCurrencies,
        takeRate: takeRate,
      });
      expect(savedPartner).toBe(partner);

      const [repoSaveRequest] = capture(partnerRepo.addPartner).last();
      expect(repoSaveRequest.props.name).toBe(partnerName);
      expect(repoSaveRequest.props.config.cryptocurrencyAllowList).toBe(allowedCryptoCurrencies);
      expect(repoSaveRequest.props.config.viewOtherWallets).toBe(true);
      expect(repoSaveRequest.props.config.privateWallets).toBe(false);
      expect(repoSaveRequest.props.config.bypassLogonOTP).toBe(false);
      expect(repoSaveRequest.props.config.bypassWalletOTP).toBe(false);
      expect(repoSaveRequest.props.config.fees.creditCardFeeDiscountPercent).toBe(0);
      expect(repoSaveRequest.props.config.fees.networkFeeDiscountPercent).toBe(0);
      expect(repoSaveRequest.props.config.fees.nobaFeeDiscountPercent).toBe(0);
      expect(repoSaveRequest.props.config.fees.processingFeeDiscountPercent).toBe(0);
      expect(repoSaveRequest.props.config.fees.spreadDiscountPercent).toBe(0);
      expect(repoSaveRequest.props.config.fees.takeRate).toBe(takeRate);
    });

    it("should save the specified values of the non-required parameters", async () => {
      const partnerName: string = "partner name";
      const allowedCryptoCurrencies = ["ETH", "USDC"];
      const takeRate = 10;

      const partner = Partner.createPartner({
        name: partnerName,
        config: {
          cryptocurrencyAllowList: allowedCryptoCurrencies,
          viewOtherWallets: false,
          privateWallets: true,
          bypassLogonOTP: true,
          bypassWalletOTP: true,
          fees: {
            creditCardFeeDiscountPercent: 1,
            networkFeeDiscountPercent: 2,
            nobaFeeDiscountPercent: 3,
            processingFeeDiscountPercent: 4,
            spreadDiscountPercent: 5,
            takeRate: takeRate,
          },
        },
      });
      when(partnerRepo.addPartner(anything())).thenResolve(partner);

      await partnerService.createPartner({
        name: partnerName,
        allowedCryptoCurrencies: allowedCryptoCurrencies,
        takeRate: takeRate,
        bypassLoginOtp: true,
        bypassWalletOtp: true,
        keepWalletsPrivate: true,
        makeOtherPartnerWalletsVisible: false,
        creditCardFeeDiscountPercent: 1,
        networkFeeDiscountPercent: 2,
        nobaFeeDiscountPercent: 3,
        processingFeeDiscountPercent: 4,
        spreadDiscountPercent: 5,
      });

      const [repoSaveRequest] = capture(partnerRepo.addPartner).last();
      expect(repoSaveRequest.props.name).toBe(partnerName);
      expect(repoSaveRequest.props.config.cryptocurrencyAllowList).toBe(allowedCryptoCurrencies);
      expect(repoSaveRequest.props.config.viewOtherWallets).toBe(false);
      expect(repoSaveRequest.props.config.privateWallets).toBe(true);
      expect(repoSaveRequest.props.config.bypassLogonOTP).toBe(true);
      expect(repoSaveRequest.props.config.bypassWalletOTP).toBe(true);
      expect(repoSaveRequest.props.config.fees.creditCardFeeDiscountPercent).toBe(1);
      expect(repoSaveRequest.props.config.fees.networkFeeDiscountPercent).toBe(2);
      expect(repoSaveRequest.props.config.fees.nobaFeeDiscountPercent).toBe(3);
      expect(repoSaveRequest.props.config.fees.processingFeeDiscountPercent).toBe(4);
      expect(repoSaveRequest.props.config.fees.spreadDiscountPercent).toBe(5);
      expect(repoSaveRequest.props.config.fees.takeRate).toBe(takeRate);
    });
  });

  describe("partner service tests", () => {
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
        config: { fees: { takeRate: newTakeRate } as any },
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatePartner))).thenResolve(updatePartner);

      const result = await partnerService.updatePartner(partner.props._id, {
        config: { fees: { takeRate: newTakeRate } as any },
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
      // Use anything() because we can't predict the values of webhookClientID and webhookSecret
      when(partnerRepo.updatePartner(anything())).thenResolve(updatedPartner);

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
