import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockBankFactoryWithDefaults } from "../mocks/mock.bank.factory";
import { BankFactory } from "../factory/bank.factory";
import { PaymentService } from "../payment.service";
import { instance, when } from "ts-mockito";
import { BankName } from "../domain/BankFactoryTypes";
import { MonoService } from "../mono/mono.service";
import { getMockMonoServiceWithDefaults } from "../mono/mocks/mock.mono.service";
import { CircleService } from "../circle/circle.service";
import { getMockCircleServiceWithDefaults } from "../circle/mocks/mock.circle.service";

describe("PaymentService", () => {
  let bankFactory: BankFactory;
  let paymentService: PaymentService;
  let mockCircleService: CircleService;
  let mockMonoService: MonoService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    bankFactory = getMockBankFactoryWithDefaults();
    mockCircleService = getMockCircleServiceWithDefaults();
    mockMonoService = getMockMonoServiceWithDefaults();

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
      when(bankFactory.getBankImplementation(BankName.CIRCLE)).thenReturn(instance(mockCircleService));
      when(mockCircleService.getBalance("account-id")).thenResolve({ balance: 100, currency: "USD" });

      expect(paymentService.getBalance(BankName.CIRCLE, "account-id")).resolves.toEqual({
        balance: 100,
        currency: "USD",
      });
    });

    it("should get balance of Mono", async () => {
      when(bankFactory.getBankImplementation(BankName.MONO)).thenReturn(instance(mockMonoService));
      when(mockMonoService.getBalance("account-id")).thenResolve({ balance: 100, currency: "COP" });

      expect(paymentService.getBalance(BankName.MONO, "account-id")).resolves.toEqual({
        balance: 100,
        currency: "COP",
      });
    });

    it("should throw error if bank is not supported", async () => {
      when(bankFactory.getBankImplementation(BankName.CIRCLE)).thenThrow(new Error("No supported bank"));

      expect(paymentService.getBalance(null, "account-id")).resolves.toEqual({
        balance: null,
        currency: null,
      });
    });
  });
});
