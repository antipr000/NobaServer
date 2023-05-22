import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { CircleService } from "../../public/circle.service";
import { getMockCircleServiceWithDefaults } from "../../public/mocks/mock.circle.service";
import { EmployerService } from "../../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../../modules/employer/mocks/mock.employer.service";
import { ExchangeRateService } from "../../../../modules/exchangerate/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../../modules/exchangerate/mocks/mock.exchangerate.service";
import { Currency } from "../../../../modules/transaction/domain/TransactionTypes";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { CircleWorkflowService } from "../circle.workflow.service";

describe("CircleWorkflowService", () => {
  let circleService: CircleService;
  let employerService: EmployerService;
  let circleWorkflowService: CircleWorkflowService;
  let exchangeRateService: ExchangeRateService;

  beforeAll(async () => {
    circleService = getMockCircleServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: CircleService,
          useFactory: () => instance(circleService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
        },
        CircleWorkflowService,
      ],
      controllers: [],
    }).compile();

    circleWorkflowService = app.get<CircleWorkflowService>(CircleWorkflowService);
  });

  describe("getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls", () => {
    it("should deduct the allocationAmount and return the balance", async () => {
      when(employerService.getTotalAllocationAmountAcrossInvoicedPayrolls()).thenResolve(1100);
      when(circleService.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(circleService.getWalletBalance("MASTER_WALLET_ID")).thenResolve(100);
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve({
        nobaRate: 0.01,
        bankRate: 0.01,
        denominatorCurrency: Currency.USD,
        numeratorCurrency: Currency.COP,
      });

      const result = await circleWorkflowService.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls();

      expect(result).toStrictEqual({
        walletID: "MASTER_WALLET_ID",
        balance: 89,
      });
    });

    it("should fail if the circle service failed", async () => {
      when(employerService.getTotalAllocationAmountAcrossInvoicedPayrolls()).thenResolve(1100);
      when(circleService.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(circleService.getWalletBalance("MASTER_WALLET_ID")).thenReject(
        new ServiceException({ errorCode: ServiceErrorCode.RATE_LIMIT_EXCEEDED }),
      );

      try {
        const result = await circleWorkflowService.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls();
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.RATE_LIMIT_EXCEEDED);
      }
    });

    it("should fail if the exchangerate service failed", async () => {
      when(employerService.getTotalAllocationAmountAcrossInvoicedPayrolls()).thenResolve(1100);
      when(circleService.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(circleService.getWalletBalance("MASTER_WALLET_ID")).thenResolve(100);
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenReject(
        new ServiceException({ errorCode: ServiceErrorCode.RATE_LIMIT_EXCEEDED }),
      );

      try {
        const result = await circleWorkflowService.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls();
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.RATE_LIMIT_EXCEEDED);
      }
    });
  });
});
