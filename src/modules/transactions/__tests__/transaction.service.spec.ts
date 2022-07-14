import { TestingModule, Test } from "@nestjs/testing";
import { instance, when } from "ts-mockito";
import { LimitsService } from "../limits.service";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.transactions.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { Consumer } from "../../consumer/domain/Consumer";
import { TransactionAllowedStatus } from "../domain/TransactionAllowedStatus";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../consumer/consumer.service";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { UserLimits } from "../domain/Limits";
import { CheckTransactionDTO } from "../dto/CheckTransactionDTO";

describe("TransactionService", () => {
  let transactionRepo: ITransactionRepo;
  let limitsService: LimitsService;
  let consumerService: ConsumerService;

  beforeEach(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        DBProvider,
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
  });

  const userId: string = "1234567890";
  const consumer: Consumer = Consumer.createConsumer({
    _id: userId,
    email: "test@noba.com",
    partners: [
      {
        partnerID: "partner-1",
      },
    ],
  });

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
    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 49, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not be above the maximum", async () => {
    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 501, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not exceed the exact monthly maximum", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Should not exceed the monthly maximum even when some is left", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1985);

    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(15);
  });

  it("Should not exceed the monthly maximum if maximum is negative", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2015);

    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Is within range so should be allowed", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: CheckTransactionDTO = await limitsService.checkTransactionLimits(consumer, 200, limits);
    expect(result.status).toBe(TransactionAllowedStatus.ALLOWED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });
});
