import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, deepEqual, instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { getMockEmployerServiceWithDefaults } from "../mocks/mock.employer.service";
import { PayrollWorkflowController } from "../payroll.workflow.controller";
import { getRandomPayroll, getRandomPayrollDisbursement } from "../test_utils/payroll.test.utils";
import { NotFoundException } from "@nestjs/common";
import { PayrollStatus } from "../domain/Payroll";

describe("EmployerWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let employerService: EmployerService;
  let payrollWorkflowController: PayrollWorkflowController;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        PayrollWorkflowController,
      ],
    }).compile();

    payrollWorkflowController = app.get<PayrollWorkflowController>(PayrollWorkflowController);
  });

  afterEach(async () => {
    jest.useRealTimers();
    app.close();
  });

  describe("createDisbursement", () => {
    it("should create a disbursement", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(
        employerService.createDisbursement(
          "fake-payroll",
          deepEqual({
            employeeID: "fake-employee",
          }),
        ),
      ).thenResolve(payrollDisbursement);

      const result = await payrollWorkflowController.createDisbursement("fake-payroll", {
        employeeID: "fake-employee",
      });

      expect(result).toStrictEqual({
        id: payrollDisbursement.id,
        employeeID: payrollDisbursement.employeeID,
        payrollID: payrollDisbursement.payrollID,
        allocationAmount: payrollDisbursement.debitAmount,
      });
    });
  });

  describe("patchDisbursement", () => {
    it("should patch a disbursement", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(employerService.updateDisbursement(anyString(), anyString(), anything())).thenResolve(payrollDisbursement);

      await payrollWorkflowController.patchDisbursement("fake-payroll", "fake-disbursement", {
        transactionID: "fake-transaction",
      });

      const [payrollID, disbursementID, updateRequest] = capture(employerService.updateDisbursement).last();
      expect(payrollID).toBe("fake-payroll");
      expect(disbursementID).toBe("fake-disbursement");
      expect(updateRequest).toStrictEqual({ transactionID: "fake-transaction" });
    });
  });

  describe("getPayroll", () => {
    it("should get a payroll", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      const result = await payrollWorkflowController.getPayroll(payroll.id);

      expect(result).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.reference,
        payrollDate: payroll.payrollDate,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });
    });

    it("should throw NotFoundException when payroll with id does not exist", async () => {
      when(employerService.getPayrollByID(anyString())).thenResolve(undefined);

      await expect(payrollWorkflowController.getPayroll("fake-payroll")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updatePayroll", () => {
    it("should update payroll", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(employerService.updatePayroll(anyString(), anything())).thenResolve(payroll);

      await payrollWorkflowController.patchPayroll(payroll.id, {
        status: PayrollStatus.COMPLETED,
      });

      const [payrollID, updateRequest] = capture(employerService.updatePayroll).last();
      expect(payrollID).toBe(payroll.id);
      expect(updateRequest).toStrictEqual({ status: "COMPLETED" });
    });
  });
});
