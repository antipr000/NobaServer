import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockBankFactoryWithDefaults } from "../mocks/mock.bank.factory";
import { BankFactory } from "../factory/bank.factory";
import { PaymentService } from "../payment.service";
import { instance } from "ts-mockito";

describe("PaymentService", () => {
  let bankFactory: BankFactory;
  let paymentService: PaymentService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    bankFactory = getMockBankFactoryWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: BankFactory,
          useFactory: () => instance(bankFactory),
        },
        PaymentService,
      ],
    }).compile();

    paymentService = app.get<PaymentService>(PaymentService);
  });

  describe("getBalance", () => {
    it("should get balance of Circle", async () => {
      // const balanceProvider: IBalanceProvider
      // when(bankFactory.getBankImplementation(BankName.CIRCLE)).thenResolve(
      // const result = await paymentService.getBalance(BankName.CIRCLE, "account-id");
      // expect(result.status).toEqual(HealthCheckStatus.OK);
    });
  });
});
