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

  it("Should not be below the minimum", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(0);
    /* This doesn't work for some reason - I get "TypeError: this.methodToStub is not a function"
    when(limitsService.getLimits(anything())).thenReturn(
      deepEqual({
        dailyLimit: 0,
        monthlyLimit: 0,
        weeklyLimit: 0,
        transactionLimit: 0,
        totalLimit: 0,
        minTransaction: 50,
        maxTransaction: 500,
      }),
    );*/

    const result: TransactionAllowedStatus = await limitsService.canMakeTransaction(consumer, 49);
    expect(result).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
  });

  it("Should not be above the maximum", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(0);

    const result: TransactionAllowedStatus = await limitsService.canMakeTransaction(consumer, 501);
    expect(result).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
  });

  it("Should not exceed the monthly maximum", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

    const result: TransactionAllowedStatus = await limitsService.canMakeTransaction(consumer, 50);
    expect(result).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
  });

  it("Is within range so should be allowed", async () => {
    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: TransactionAllowedStatus = await limitsService.canMakeTransaction(consumer, 200);
    expect(result).toBe(TransactionAllowedStatus.ALLOWED);
  });
});
