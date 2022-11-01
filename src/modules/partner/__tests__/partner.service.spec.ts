import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when, deepEqual, capture } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerRepoWithDefaults } from "../mocks/mock.partner.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Partner, PartnerWebhook } from "../domain/Partner";
import { WebhookType } from "../domain/WebhookTypes";
import { BadRequestException } from "@nestjs/common";
import { IPartnerRepo } from "../repo/PartnerRepo";
import {
  NotificationEventHandler,
  NotificationEventType,
} from "../../../modules/notifications/domain/NotificationTypes";
import { ITransactionRepo } from "../../../modules/transactions/repo/TransactionRepo";
import { getMockTransactionRepoWithDefaults } from "../../../modules/transactions/mocks/mock.transactions.repo";
import { TransactionMapper } from "../../../modules/transactions/mapper/TransactionMapper";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { PartnerLogoUploadRequestDTO } from "../dto/PartnerLogoUploadRequestDTO";

jest.mock("sharp", () => jest.fn());
import sharp from "sharp";
import {
  PARTNER_CONFIG_KEY,
  PARTNER_PUBLIC_DATA_S3_BUCKET_KEY,
  PARTNER_PUBLIC_CLOUDFRONT_URL_KEY,
} from "../../../config/ConfigurationUtils";

const mS3Instance: any = {};

jest.mock("aws-sdk", () => {
  return { S3: jest.fn(() => mS3Instance) };
});

const defaultEnvironmentVariables = {
  [PARTNER_CONFIG_KEY]: {
    [PARTNER_PUBLIC_DATA_S3_BUCKET_KEY]: "noba-partner-data",
    [PARTNER_PUBLIC_CLOUDFRONT_URL_KEY]: "https://d1we8r7iaq9rpl.cloudfront.net/",
  },
};

describe("PartnerService", () => {
  let partnerService: PartnerService;
  let partnerRepo: IPartnerRepo;
  let transactionRepo: ITransactionRepo;
  const transactionMapper = new TransactionMapper();

  jest.setTimeout(20000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    partnerRepo = getMockPartnerRepoWithDefaults();
    transactionRepo = getMockTransactionRepoWithDefaults();

    const PartnerRepoProvider = {
      provide: "PartnerRepo",
      useFactory: () => instance(partnerRepo),
    };
    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(defaultEnvironmentVariables), getTestWinstonModule()],
      controllers: [],
      providers: [
        PartnerRepoProvider,
        PartnerService,
        {
          provide: "TransactionRepo",
          useFactory: () => instance(transactionRepo),
        },
      ],
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
      const partnerName = "partner name";
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
          notificationConfig: [],
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
      const partnerName = "partner name";
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
          notificationConfig: [],
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
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
      });
      const updatedPartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "New Partner Name",
        apiKey: "mockPublicKey",
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
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
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
      });
      const newTakeRate = 20;
      const updatePartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
        config: { fees: { takeRate: newTakeRate } as any, notificationConfig: [] },
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatePartner))).thenResolve(updatePartner);

      const result = await partnerService.updatePartner(partner.props._id, { takeRate: newTakeRate });
      expect(result).toStrictEqual(updatePartner);
    });

    it("should update notification configurations", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
        config: {
          fees: { takeRate: 10 } as any,
          notificationConfig: [
            {
              notificationEventType: NotificationEventType.SEND_OTP_EVENT,
              notificationEventHandler: [NotificationEventHandler.EMAIL],
            },
          ],
        },
      });

      const updatePartner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        apiKeyForEmbed: "fakeApiKeyForEmbed",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
        config: {
          fees: { takeRate: 10 } as any,
          notificationConfig: [
            {
              notificationEventType: NotificationEventType.SEND_OTP_EVENT,
              notificationEventHandler: [NotificationEventHandler.WEBHOOK],
            },
          ],
        },
      });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatePartner))).thenResolve(updatePartner);

      const result = await partnerService.updatePartner(partner.props._id, {
        notificationConfigs: [
          {
            notificationEventType: NotificationEventType.SEND_OTP_EVENT,
            notificationEventHandler: [NotificationEventHandler.WEBHOOK],
          },
        ],
      });
      expect(result).toStrictEqual(updatePartner);
    });
  });

  describe("getAllTransactionsForPartner", () => {
    it("should return all transactions for partner", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: "user-id-1",
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: "fake-wallet",
        transactionTimestamp: new Date(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      const allTransactionsResult: PaginatedResult<Transaction> = {
        items: [transaction],
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
      };

      when(transactionRepo.getFilteredTransactions(deepEqual({ partnerID: transaction.props.partnerID }))).thenResolve(
        allTransactionsResult,
      );

      const response = await partnerService.getAllTransactionsForPartner(transaction.props.partnerID, {});
      expect(response.totalItems).toBe(1);
      expect(response.items[0]).toStrictEqual(transactionDTO);
    });
  });

  describe("getTransaction", () => {
    it("should return requested transaction", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: "user-id-1",
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: "fake-wallet",
        transactionTimestamp: new Date(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      when(transactionRepo.getTransaction(transaction.props._id)).thenResolve(transaction);

      const response = await partnerService.getTransaction(transaction.props._id);

      expect(response).toStrictEqual(transactionDTO);
    });
  });

  describe("getPartnerFromApiKey", () => {
    it("returns partner account with given api key", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
        webhooks: [],
      });

      when(partnerRepo.getPartnerFromApiKey(partner.props.apiKey)).thenResolve(partner);

      const response = await partnerService.getPartnerFromApiKey(partner.props.apiKey);
      expect(response).toStrictEqual(partner);
    });
  });

  describe("getWebhook", () => {
    it("should return webhooks of given type", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
        webhooks: [{ url: "url1", type: WebhookType.NOTIFICATION }],
      });

      const response = await partnerService.getWebhook(partner, WebhookType.NOTIFICATION);

      expect(response.url).toBe("url1");
    });

    it("should return null if webhook of given type does not exist", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
        webhooks: [],
      });

      const response = await partnerService.getWebhook(partner, WebhookType.NOTIFICATION);

      expect(response).toBe(null);
    });
  });

  describe("addOrReplaceWebhook", () => {
    it("should add new webhook", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        apiKeyForEmbed: "mockApiKeyForEmbed",
        webhookClientID: "mockClientID",
        webhookSecret: "mockWebhookSecret",
        webhooks: [],
      });

      const updatedPartner = Partner.createPartner({
        ...partner.props,
        webhooks: [{ url: "url2", type: WebhookType.NOTIFICATION } as PartnerWebhook],
      });
      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);

      const response = await partnerService.addOrReplaceWebhook(partner.props._id, WebhookType.NOTIFICATION, "url2");
      expect(response).toStrictEqual(updatedPartner);
    });

    it("should throw BadRequestException when partner with id does not exist", async () => {
      const id = "mock-partner-2";

      when(partnerRepo.getPartner(id)).thenResolve(null);

      try {
        await partnerService.addOrReplaceWebhook(id, WebhookType.NOTIFICATION, "url2");
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Unknown partner ID");
      }
    });
  });

  describe("uploadPartnerLogo", () => {
    const partner = Partner.createPartner({
      _id: "mock-partner-1",
      name: "Mock Partner",
      apiKey: "mockPublicKey",
      secretKey: "mockPrivateKey",
      apiKeyForEmbed: "mockApiKeyForEmbed",
      webhookClientID: "mockClientID",
      webhookSecret: "mockWebhookSecret",
      webhooks: [],
    });

    const NOBA_BUCKET = "noba-partner-data";

    it("should throw exception when no logo was sent in the requeest", async () => {
      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);

      try {
        await partnerService.uploadPartnerLogo(partner.props._id, {});
        expect(true).toBe(false);
      } catch (e) {
        console.log(e);
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should update partner logo", async () => {
      mS3Instance.upload = jest.fn().mockReturnThis();
      mS3Instance.promise = jest
        .fn()
        .mockReturnValueOnce({ Location: `${partnerService.s3BucketUrl}mock-location-logo` })
        .mockReturnValueOnce({ Location: `${partnerService.s3BucketUrl}mock-location-logo-small` });

      when(partnerRepo.getPartner(partner.props._id)).thenResolve(partner);

      const testBuffer = Buffer.from("test");

      const multer_file: Express.Multer.File = {
        originalname: "sample.name",
        mimetype: "image/png",
        buffer: testBuffer,
      } as any;

      const logoRequest: PartnerLogoUploadRequestDTO = {
        logo: [multer_file],
        logoSmall: [multer_file],
      };

      const toBuffer = jest.fn(() => testBuffer);
      const resize = jest.fn(() => ({ toBuffer }));
      (sharp as any).mockImplementation(() => ({ resize }));
      (sharp as any).fit = { inside: jest.fn() };

      const updatedPartner = Partner.createPartner({
        ...partner.props,
        config: {
          ...partner.props.config,
          logo: `${partnerService.cloudfrontUrl}mock-location-logo`,
          logoSmall: `${partnerService.cloudfrontUrl}mock-location-logo-small`,
        },
      });

      when(partnerRepo.updatePartner(deepEqual(updatedPartner))).thenResolve(updatedPartner);

      // ***  finally calling ***
      await partnerService.uploadPartnerLogo(partner.props._id, logoRequest);

      // ***  checking ***
      expect(mS3Instance.upload).toBeCalledTimes(2);
      // expect(mS3Instance.upload).nthCalledWith(1, {})
      const firstCall = mS3Instance.upload.mock.calls[0][0];
      console.log(firstCall);
      const secondCall = mS3Instance.upload.mock.calls[1][0];

      expect(firstCall.Body).toBe(testBuffer);
      expect(firstCall.Bucket).toBe(NOBA_BUCKET);
      expect(firstCall.Key).toMatch(/^e2e_test\/mock\-partner_mock\-partner-1\/logo_.+\.png/);
      expect(firstCall.ContentType).toBe("image/png");

      expect(secondCall.Body).toBe(testBuffer);
      expect(secondCall.Bucket).toBe(NOBA_BUCKET);
      expect(secondCall.Key).toMatch(/^e2e_test\/mock\-partner_mock\-partner-1\/logo_small.+\.png/);
      expect(secondCall.ContentType).toBe("image/png");
    });
  });
});
