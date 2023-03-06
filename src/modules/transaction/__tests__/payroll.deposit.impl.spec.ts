import { Test, TestingModule } from "@nestjs/testing";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Currency } from "../domain/TransactionTypes";
import { PayrollDepositImpl } from "../factory/payroll.deposit.impl";

describe("WorkflowFactory Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let payrollDepositImpl: PayrollDepositImpl;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PayrollDepositImpl],
    }).compile();

    payrollDepositImpl = app.get<PayrollDepositImpl>(PayrollDepositImpl);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getTransactionQuote ()", () => {
    it("should throw ServiceException with SEMANTIC_VALIDATION errorCode", async () => {
      try {
        await payrollDepositImpl.getTransactionQuote(2, Currency.COP, Currency.USD, []);
        expect(true).toBe(false);
      } catch (ex) {
        expect(ex).toBeInstanceOf(ServiceException);
        expect(ex.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });
  });

  describe("initiateWorkflow ()", () => {
    it("should return without error", async () => {
      await payrollDepositImpl.initiateWorkflow(null, null);
    });
  });

  describe("preprocessTransactionParams ()", () => {
    it("should throw NOT_IMPLEMENTED error", async () => {
      try {
        await payrollDepositImpl.preprocessTransactionParams(null, null);
        expect(true).toBe(false);
      } catch (ex) {
        expect(ex).toBeInstanceOf(ServiceException);
        expect(ex.errorCode).toBe(ServiceErrorCode.NOT_IMPLEMENTED);
      }
    });
  });
});
