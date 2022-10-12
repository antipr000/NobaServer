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
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
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

    it("should populate the webhook Client ID and secret if null when adding a webhook", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
        webhookClientID: "fakeWebhookClientID",
        webhookSecret: "fakeWebhookSecret",
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
        apiKeyForEmbed: "fakeApiKeyForEmbed",
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
});
