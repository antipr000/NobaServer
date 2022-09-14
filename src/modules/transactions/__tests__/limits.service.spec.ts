import { Test, TestingModule } from "@nestjs/testing";
import { UserVerificationStatus } from "../../../modules/consumer/domain/UserVerificationStatus";
import { instance, when } from "ts-mockito";
import {
  COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY,
  COMMON_CONFIG_KEY,
  COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY,
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SLIPPAGE_ALLOWED_PERCENTAGE,
  SPREAD_PERCENTAGE,
} from "../../../config/ConfigurationUtils";
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
import {
  TransactionLimitBuyOnly,
  DailyLimitBuyOnly,
  WeeklyLimitBuyOnly,
  MonthlyLimitBuyOnly,
  LifetimeLimitBuyOnly,
  UserLimits,
} from "../domain/Limits";

const defaultEnvironmentVariables = {
  [NOBA_CONFIG_KEY]: {
    [NOBA_TRANSACTION_CONFIG_KEY]: {
      [SPREAD_PERCENTAGE]: 0.6,
      [FLAT_FEE_DOLLARS]: 0,
      [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0,
      [FIXED_CREDIT_CARD_FEE]: 0,
      [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
    },
  },
  [COMMON_CONFIG_KEY]: {
    [COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY]: 35,
    [COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY]: 350,
  },
};

describe("LimitsService", () => {
  let transactionRepo: ITransactionRepo;
  let limitsService: LimitsService;
  let consumerService: ConsumerService;

  const userId = "1234567890";
  const consumer: Consumer = Consumer.createConsumer({
    _id: userId,
    email: "test@noba.com",
    partners: [
      {
        partnerID: "partner-1",
      },
    ],
  });

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

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
      ],
    }).compile();

    limitsService = app.get<LimitsService>(LimitsService);
  };

  const limits: UserLimits = {
    dailyLimit: 200,
    monthlyLimit: 2000,
    weeklyLimit: 1000,
    transactionLimit: 0,
    totalLimit: 10000,
    minTransaction: 50,
    maxTransaction: 500,
  };

  it("Should not be below the minimum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 49, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not be above the maximum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 501, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not exceed the exact monthly maximum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Should not exceed the monthly maximum even when some is left", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1985);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(15);
  });

  it("Should not exceed the monthly maximum if maximum is negative", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2015);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Is within range so should be allowed", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 200, limits);
    expect(result.status).toBe(TransactionAllowedStatus.ALLOWED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Returns limits for the user", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: ConsumerLimitsDTO = await limitsService.getConsumerLimits(consumer, limits);
    expect(result.minTransaction).toBe(50);
    expect(result.maxTransaction).toBe(500);
    expect(result.monthly.max).toBe(2000);
    expect(result.monthly.used).toBe(1000);
    expect(result.monthly.period).toBe(30);
  });

  describe("getLimits", () => {
    it("limits for user verification status NOT_VERIFIED", () => {
      const limits: UserLimits = limitsService.getLimits(UserVerificationStatus.NOT_VERIFIED);
      const expectedLimits = {
        dailyLimit: DailyLimitBuyOnly.no_kyc_max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.no_kyc_max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.no_kyc_max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.no_kyc_max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.no_kyc_max_amount_limit,
        minTransaction: 35,
        maxTransaction: 350,
      };

      expect(limits).toStrictEqual(expectedLimits);
    });

    it("limits for user verification status PARTIALLY_VERIFIED", () => {
      const limits: UserLimits = limitsService.getLimits(UserVerificationStatus.PARTIALLY_VERIFIED);
      const expectedLimits = {
        dailyLimit: DailyLimitBuyOnly.partial_kyc_max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.partial_kyc_max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.partial_kyc_max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.partial_kyc_max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.partial_kyc_max_amount_limit,
        minTransaction: 35,
        maxTransaction: 350,
      };
      expect(limits).toStrictEqual(expectedLimits);
    });

    it("limits for user verification status VERIFIED", () => {
      const limits: UserLimits = limitsService.getLimits(UserVerificationStatus.VERIFIED);
      const expectedLimits = {
        dailyLimit: DailyLimitBuyOnly.max_amount_limit,
        monthlyLimit: MonthlyLimitBuyOnly.max_amount_limit,
        weeklyLimit: WeeklyLimitBuyOnly.max_amount_limit,
        transactionLimit: TransactionLimitBuyOnly.max_amount_limit,
        totalLimit: LifetimeLimitBuyOnly.max_amount_limit,
        minTransaction: 35,
        maxTransaction: 350,
      };

      expect(limits).toStrictEqual(expectedLimits);
    });
  });
});
