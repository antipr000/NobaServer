import { Test, TestingModule } from "@nestjs/testing";
import { instance, when } from "ts-mockito";

import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerService } from "../../consumer/consumer.service";
import { Consumer } from "../../consumer/domain/Consumer";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { TransactionAllowedStatus } from "../../transactions/domain/TransactionAllowedStatus";
import { CheckTransactionDTO } from "../dto/CheckTransactionDTO";
import { ConsumerLimitsDTO } from "../dto/ConsumerLimitsDTO";
import { LimitsService } from "../limits.service";

import { ILimitProfileRepo } from "../repo/limitprofile.repo";
import { ILimitConfigurationRepo } from "../repo/limitconfiguration.repo";
import { getMockLimitProfileRepoWithDefaults } from "../mocks/mock.limitprofile.repo";
import { getMockLimitConfigRepoWithDefaults } from "../mocks/mock.limitconfig.repo";
import { LimitProfile } from "../domain/LimitProfile";
import { LimitConfiguration } from "../domain/LimitConfiguration";
import { TransactionType, PaymentMethodType } from "@prisma/client";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { ITransactionRepo } from "../repo/transaction.repo";
import {
  LIMIT_CONFIGURATION_REPO_PROVIDER,
  LIMIT_PROFILE_REPO_PROVIDER,
  TRANSACTION_REPO_PROVIDER,
} from "../repo/transaction.repo.module";

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
          provide: TRANSACTION_REPO_PROVIDER,
          useFactory: () => instance(transactionRepo),
        },
        {
          provide: LIMIT_PROFILE_REPO_PROVIDER,
          useFactory: () => instance(limitProfileRepo),
        },
        {
          provide: LIMIT_CONFIGURATION_REPO_PROVIDER,
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
      const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
        id: "limit-config-1",
        isDefault: true,
        priority: 2,
        profileID: "fake-limit-profile",
      });

      const limitProfile = LimitProfile.createLimitProfile({
        id: "fake-limit-profile",
        name: "Fake Limit Profile",
        unsettledExposure: 250,
        daily: 500,
        weekly: 1000,
        monthly: 2000,
        maxTransaction: 500,
        minTransaction: 50,
      });

      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([defaultLimitConfiguration]);
      when(limitProfileRepo.getProfile("fake-limit-profile")).thenResolve(limitProfile);
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
    });
    it("Should not be below the minimum for card", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        49,
        TransactionType.NOBA_WALLET,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });

    it("Should not be above the maximum for card", async () => {
      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        501,
        TransactionType.NOBA_WALLET,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });

    it("Should not exceed the exact monthly maximum for card", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,
        TransactionType.NOBA_WALLET,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(0);
    });

    it("Should not exceed the monthly maximum even when some is left", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1985);

      const result: CheckTransactionDTO = await limitsService.canMakeTransaction(
        consumer,
        50,
        TransactionType.NOBA_WALLET,
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

        TransactionType.NOBA_WALLET,
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
        TransactionType.NOBA_WALLET,
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
        TransactionType.NOBA_WALLET,
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
        TransactionType.NOBA_WALLET,
        PaymentMethodType.CARD,
      );
      expect(result.status).toBe(TransactionAllowedStatus.ALLOWED);
      expect(result.rangeMin).toBe(50);
      expect(result.rangeMax).toBe(500);
    });
  });

  describe("getConsumerLimits", () => {
    beforeAll(() => {
      const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
        id: "limit-config-1",
        isDefault: true,
        priority: 2,
        profileID: "fake-limit-profile",
      });

      const limitProfile = LimitProfile.createLimitProfile({
        id: "fake-limit-profile",
        name: "Fake Limit Profile",
        unsettledExposure: 1,
        daily: 500,
        weekly: 1000,
        monthly: 2000,
        maxTransaction: 500,
        minTransaction: 50,
      });

      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([defaultLimitConfiguration]);
      when(limitProfileRepo.getProfile("fake-limit-profile")).thenResolve(limitProfile);
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
    });
    it("Returns limits for the user", async () => {
      when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

      const result: ConsumerLimitsDTO = await limitsService.getConsumerLimits(
        consumer,

        TransactionType.NOBA_WALLET,
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
    const walletTransactionProfileCard = LimitProfile.createLimitProfile({
      id: "wallet-limit-profile-card",
      name: "Wallet Limit Profile",
      daily: 1000,
      weekly: 2000,
      monthly: 10000,
      minTransaction: 10,
      maxTransaction: 200,
      unsettledExposure: 1,
    });

    const walletTransactionProfileACH = LimitProfile.createLimitProfile({
      id: "wallet-limit-profile-ach",
      name: "Wallet Limit Profile",
      daily: 1000,
      weekly: 2000,
      monthly: 10000,
      minTransaction: 10,
      maxTransaction: 200,
      unsettledExposure: 1,
    });

    const minTotalTransactionProfile = LimitProfile.createLimitProfile({
      id: "transaction-limit-profile",
      name: "Min Total Transaction Profile",
      daily: 1000,
      weekly: 2000,
      monthly: 10000,
      minTransaction: 10,
      maxTransaction: 200,
      unsettledExposure: 1,
    });

    const defaultProfile = LimitProfile.createLimitProfile({
      id: "default-limit-profile",
      name: "Fake Limit Profile",
      daily: 1000,
      weekly: 2000,
      monthly: 10000,
      minTransaction: 10,
      maxTransaction: 200,
      unsettledExposure: 1,
    });

    const defaultLimitConfiguration = LimitConfiguration.createLimitConfiguration({
      id: "limit-config-1",
      isDefault: true,
      priority: 2,
      profileID: defaultProfile.props.id,
      minTotalTransactionAmount: 500,
    });

    const walletSpecificConfigForCard = LimitConfiguration.createLimitConfiguration({
      id: "wallet-config-1",
      isDefault: false,
      priority: 5,
      profileID: walletTransactionProfileCard.props.id,
      transactionType: TransactionType.NOBA_WALLET,
      paymentMethodType: PaymentMethodType.CARD,
    });

    const walletSpecificConfigForACH = LimitConfiguration.createLimitConfiguration({
      id: "wallet-config-2",
      isDefault: false,
      priority: 5,
      profileID: walletTransactionProfileCard.props.id,
      transactionType: TransactionType.NOBA_WALLET,
      paymentMethodType: PaymentMethodType.ACH,
    });

    const minTransactionAmountConfig = LimitConfiguration.createLimitConfiguration({
      id: "transaction-config-1",
      isDefault: false,
      priority: 3,
      profileID: minTotalTransactionProfile.props.id,
      minTotalTransactionAmount: 1000,
      paymentMethodType: PaymentMethodType.CARD,
    });

    beforeAll(async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(limitConfigRepo.getAllLimitConfigs()).thenResolve([
        walletSpecificConfigForACH,
        walletSpecificConfigForCard,
        minTransactionAmountConfig,
        defaultLimitConfiguration,
      ]);
      when(limitProfileRepo.getProfile(walletTransactionProfileCard.props.id)).thenResolve(
        walletTransactionProfileCard,
      );
      when(limitProfileRepo.getProfile(walletTransactionProfileACH.props.id)).thenResolve(walletTransactionProfileACH);
      when(limitProfileRepo.getProfile(minTotalTransactionProfile.props.id)).thenResolve(minTotalTransactionProfile);
      when(limitProfileRepo.getProfile(defaultProfile.props.id)).thenResolve(defaultProfile);
    });

    it("should return wallet specific profile for CARD when transaction type is NOBA_WALLET", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
      const profile = await limitsService.getLimits(consumer, TransactionType.NOBA_WALLET, PaymentMethodType.CARD);
      expect(profile).toStrictEqual(walletTransactionProfileCard);
    });

    it("should return minimum transaction specific profile when total transaction amount exceeds", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(2000);
      const profile = await limitsService.getLimits(consumer);
      expect(profile).toStrictEqual(minTotalTransactionProfile);
    });

    it("should return default profile when none of the conditions match", async () => {
      when(transactionRepo.getTotalUserTransactionAmount(userId)).thenResolve(200);
      const profile = await limitsService.getLimits(consumer);
      expect(profile).toStrictEqual(defaultProfile);
    });
  });
});
