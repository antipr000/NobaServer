import { Test, TestingModule } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";

import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerService } from "../../consumer/consumer.service";
import { Consumer } from "../../consumer/domain/Consumer";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { TransactionAllowedStatus } from "../domain/TransactionAllowedStatus";
import { CheckTransactionDTO } from "../dto/CheckTransactionDTO";
import { ConsumerLimitsDTO } from "../dto/ConsumerLimitsDTO";
import { LimitsService } from "../limits.service";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.transactions.repo";
import { ITransactionRepo } from "../repo/TransactionRepo";

import { ILimitProfileRepo } from "../repo/LimitProfileRepo";
import { ILimitConfigurationRepo } from "../repo/LimitConfigurationRepo";
import { getMockLimitProfileRepoWithDefaults } from "../mocks/mock.limit.profile.repo";
import { getMockLimitConfigRepoWithDefaults } from "../mocks/mock.limit.config.repo";
import { LimitProfile, Limits } from "../domain/LimitProfile";
import { LimitConfiguration } from "../domain/LimitConfiguration";
import { TransactionType } from "../domain/Types";
import { PaymentMethodType } from "../../../modules/consumer/domain/Types";

const defaultEnvironmentVariables = {};

describe("LimitsService", () => {
  let transactionRepo: ITransactionRepo;
  let limitsService: LimitsService;
  let consumerService: ConsumerService;
  let limitProfileRepo: ILimitProfileRepo;
  let limitConfigRepo: ILimitConfigurationRepo;

  const userId = "1234567890";
  const consumer: Consumer = Consumer.createConsumer({
    id: userId,
    email: "test@noba.com",
  });

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    limitProfileRepo = getMockLimitProfileRepoWithDefaults();
    limitConfigRepo = getMockLimitConfigRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        LimitsService,
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: "TransactionRepo",
          useFactory: () => instance(transactionRepo),
        },
        {
          provide: "LimitProfileRepo",
          useFactory: () => instance(limitProfileRepo),
        },
        {
          provide: "LimitConfigurationRepo",
          useFactory: () => instance(limitConfigRepo),
        },
      ],
    }).compile();

    limitsService = app.get<LimitsService>(LimitsService);
  };

  beforeAll(async () => {
    await setupTestModule(defaultEnvironmentVariables);
  });

  describe("canMakeTransaction", () => {
    beforeAll(() => {
      const cardLimits: Limits = {
        daily: 500,
        weekly: 1000,
        monthly: 2000,
        maxTransaction: 500,
        minTransaction: 50,
      };

      const bankLimits: Limits = {
        daily: 300,
        weekly: 500,
        monthly: 1000,
        maxTransaction: 200,
        minTransaction: 20,
      };

      const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
        _id: "limit-config-1",
        isDefault: true,
        priority: 2,
        profile: "fake-limit-profile",
        criteria: {},
      });

      const limitProfile = LimitProfile.createLimitProfile({
        _id: "fake-limit-profile",
        name: "Fake Limit Profile",
        cardLimits: cardLimits,
        bankLimits: bankLimits,
        unsettledExposure: 250,
      });

      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([defaultLimitConfiguration]);
      when(limitProfileRepo.getProfile("fake-limit-profile")).thenResolve(limitProfile);
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
    });
    it("Should not be below the minimum for card", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        49,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });

    it("should not be below minimum for ach", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        18,

        TransactionType.ONRAMP,
        PaymentMethodType.ACH,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
      expect(result.rangeMin).toBe(20);
      expect(result.rangeMax).toBe(200);
    });

    it("Should not be above the maximum for card", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        501,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });

    it("should not be above the maximum for ach", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        201,

        TransactionType.ONRAMP,
        PaymentMethodType.ACH,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
      expect(result.rangeMin).toBe(20);
      expect(result.rangeMax).toBe(200);
    });

    it("Should not exceed the exact monthly maximum for card", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(0);
    });

    it("should not exceed monthly maximum for ach", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,

        TransactionType.ONRAMP,
        PaymentMethodType.ACH,
      );
      expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
      expect(result.rangeMin).toBe(20);
      expect(result.rangeMax).toBe(0);
    });

    it("Should not exceed the monthly maximum even when some is left", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1985);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(15);
    });

    it("Should not exceed the monthly maximum if maximum is negative", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2015);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(0);
    });

    it("should exceed daily limit for card", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);
      when(transactionRepo.getDailyUserTransactionAmount(userId)).thenResolve(301);
      when(transactionRepo.getWeeklyUserTransactionAmount(userId)).thenResolve(500);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        200,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );

      expect(result.status).toBe(TransactionAllowedStatus.DAILY_LIMIT_REACHED);
    });

    it("should exceed weekly limit for card", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);
      when(transactionRepo.getDailyUserTransactionAmount(userId)).thenResolve(200);
      when(transactionRepo.getWeeklyUserTransactionAmount(userId)).thenResolve(900);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        200,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );

      expect(result.status).toBe(TransactionAllowedStatus.WEEKLY_LIMIT_REACHED);
    });

    it("Is within range so should be allowed for card", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);
      when(transactionRepo.getDailyUserTransactionAmount(userId)).thenResolve(200);
      when(transactionRepo.getWeeklyUserTransactionAmount(userId)).thenResolve(250);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        200,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.ALLOWED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });
  });

  describe("getConsumerLimits", () => {
    beforeAll(() => {
      const cardLimits: Limits = {
        daily: 500,
        weekly: 1000,
        monthly: 2000,
        maxTransaction: 500,
        minTransaction: 50,
      };

      const bankLimits: Limits = {
        daily: 300,
        weekly: 500,
        monthly: 1000,
        maxTransaction: 200,
        minTransaction: 20,
      };

      const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
        _id: "limit-config-1",
        isDefault: true,
        priority: 2,
        profile: "fake-limit-profile",
        criteria: {},
      });

      const limitProfile = LimitProfile.createLimitProfile({
        _id: "fake-limit-profile",
        name: "Fake Limit Profile",
        cardLimits: cardLimits,
        bankLimits: bankLimits,
        unsettledExposure: 1,
      });

      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([defaultLimitConfiguration]);
      when(limitProfileRepo.getProfile("fake-limit-profile")).thenResolve(limitProfile);
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
    });
    it("Returns limits for the user", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

      const result: ConsumerLimitsDTO = await limitsService.getConsumerLimits(
        consumer,

        TransactionType.ONRAMP,
        PaymentMethodType.CARD,
      );
      expect(result.minTransaction).toBe(50);
      expect(result.maxTransaction).toBe(500);
      expect(result.monthly.max).toBe(2000);
      expect(result.monthly.used).toBe(1000);
      expect(result.monthly.period).toBe(30);
    });
  });

  describe("getLimits", () => {
    const specificLimitProfile = LimitProfile.createLimitProfile({
      _id: "partner-limit-profile",
      name: "Partner Limit Profile",
      cardLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      bankLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      unsettledExposure: 1,
    });

    const walletTransactionProfile = LimitProfile.createLimitProfile({
      _id: "wallet-limit-profile",
      name: "Wallet Limit Profile",
      cardLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      bankLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      unsettledExposure: 1,
    });

    const minTotalTransactionProfile = LimitProfile.createLimitProfile({
      _id: "transaction-limit-profile",
      name: "Min Total Transaction Profile",
      cardLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      bankLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      unsettledExposure: 1,
    });

    const defaultProfile = LimitProfile.createLimitProfile({
      _id: "default-limit-profile",
      name: "Fake Limit Profile",
      cardLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      bankLimits: {
        daily: 1000,
        weekly: 2000,
        monthly: 10000,
        minTransaction: 10,
        maxTransaction: 200,
      },
      unsettledExposure: 1,
    });

    const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
      _id: "limit-config-1",
      isDefault: true,
      priority: 2,
      profile: defaultProfile.props._id,
      criteria: {
        minTotalTransactionAmount: 500,
      },
    });

    const walletSpecificConfig = LimitConfiguration.createLimitConfiguration({
      _id: "wallet-config-1",
      isDefault: false,
      priority: 5,
      profile: walletTransactionProfile.props._id,
      criteria: {
        transactionType: [TransactionType.NOBA_WALLET],
      },
    });

    const minTransactionAmountConfig = LimitConfiguration.createLimitConfiguration({
      _id: "transaction-config-1",
      isDefault: false,
      priority: 3,
      profile: minTotalTransactionProfile.props._id,
      criteria: {
        minTotalTransactionAmount: 1000,
      },
    });

    beforeAll(async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([
        walletSpecificConfig,
        minTransactionAmountConfig,
        defaultLimitConfiguration,
      ]);
      when(limitProfileRepo.getProfile(specificLimitProfile.props._id)).thenResolve(specificLimitProfile);
      when(limitProfileRepo.getProfile(walletTransactionProfile.props._id)).thenResolve(walletTransactionProfile);
      when(limitProfileRepo.getProfile(minTotalTransactionProfile.props._id)).thenResolve(minTotalTransactionProfile);
      when(limitProfileRepo.getProfile(defaultProfile.props._id)).thenResolve(defaultProfile);
    });

    it("should return wallet specific profile when transaction type is NOBA_WALLET", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
      const profile = await limitsService.getLimits(consumer, TransactionType.NOBA_WALLET);
      expect(profile).toStrictEqual(walletTransactionProfile);
    });

    it("should return minimum transaction specific profile when total transaction amount exceeds", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
      const profile = await limitsService.getLimits(consumer, TransactionType.ONRAMP);
      expect(profile).toStrictEqual(minTotalTransactionProfile);
    });

    it("should return default profile when none of the conditions match", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(200);
      const profile = await limitsService.getLimits(consumer, TransactionType.ONRAMP);
      expect(profile).toStrictEqual(defaultProfile);
    });
  });
});
