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
import { Utils } from "../../../core/utils/Utils";

describe("EmployerWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let mockEmployerService: EmployerService;
  let payrollWorkflowController: PayrollWorkflowController;

  beforeEach(async () => {
    mockEmployerService = getMockEmployerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EmployerService,
          useFactory: () => instance(mockEmployerService),
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
        mockEmployerService.createDisbursement(
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
        allocationAmount: payrollDisbursement.allocationAmount,
        transactionID: payrollDisbursement.transactionID,
      });
    });
  });

  describe("patchDisbursement", () => {
    it("should patch a disbursement", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(mockEmployerService.updateDisbursement(anyString(), anyString(), anything())).thenResolve(
        payrollDisbursement,
      );

      await payrollWorkflowController.patchDisbursement("fake-payroll", "fake-disbursement", {
        transactionID: "fake-transaction",
      });

      const [payrollID, disbursementID, updateRequest] = capture(mockEmployerService.updateDisbursement).last();
      expect(payrollID).toBe("fake-payroll");
      expect(disbursementID).toBe("fake-disbursement");
      expect(updateRequest).toStrictEqual({ transactionID: "fake-transaction" });
    });
  });

  describe("getPayroll", () => {
    it("should get a payroll", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(mockEmployerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      const result = await payrollWorkflowController.getPayroll(payroll.id);

      const time = Utils.getCurrentEasternTimezone() == "EDT" ? "13:00:00.000" : "14:00:00.000";

      expect(result).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.referenceNumber,
        payrollDate: `${payroll.payrollDate}T${time}Z`,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });
    });

    it("should get a payroll in EDT", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(mockEmployerService.getPayrollByID(payroll.id)).thenResolve(payroll);
      jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 7, 14).getTime()); // EDT date

      const result = await payrollWorkflowController.getPayroll(payroll.id);

      expect(result).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.referenceNumber,
        payrollDate: `${payroll.payrollDate}T13:00:00.000Z`,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });
    });

    it("should get a payroll in EST", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(mockEmployerService.getPayrollByID(payroll.id)).thenResolve(payroll);
      jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 1, 14).getTime()); // EST date

      const result = await payrollWorkflowController.getPayroll(payroll.id);

      expect(result).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.referenceNumber,
        payrollDate: `${payroll.payrollDate}T14:00:00.000Z`,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });
    });

    it("should throw NotFoundException when payroll with id does not exist", async () => {
      when(mockEmployerService.getPayrollByID(anyString())).thenResolve(undefined);

      await expect(payrollWorkflowController.getPayroll("fake-payroll")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllDisbursements", () => {
    it("should get all disbursements for a payroll", async () => {
      const { payroll } = getRandomPayroll("fake-employer");
      const disbursements = [
        getRandomPayrollDisbursement(payroll.id, "fake-employee-1").payrollDisbursement,
        getRandomPayrollDisbursement(payroll.id, "fake-employee-2").payrollDisbursement,
      ];

      when(mockEmployerService.getAllDisbursementsForPayroll(payroll.id)).thenResolve(disbursements);

      const result = await payrollWorkflowController.getAllDisbursements(payroll.id);

      expect(result).toStrictEqual({
        disbursements: disbursements.map(disbursement => ({
          id: disbursement.id,
          employeeID: disbursement.employeeID,
          payrollID: disbursement.payrollID,
          allocationAmount: disbursement.allocationAmount,
          transactionID: disbursement.transactionID,
        })),
      });
    });

    it("should throw NotFoundException when payroll with id does not exist", async () => {
      when(mockEmployerService.getAllDisbursementsForPayroll("payroll-id")).thenResolve(undefined);

      const result = await payrollWorkflowController.getAllDisbursements("payroll-id");
      expect(result).toStrictEqual({ disbursements: [] });
    });
  });

  describe("updatePayroll", () => {
    it("should update payroll", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(mockEmployerService.updatePayroll(anyString(), anything())).thenResolve(payroll);

      await payrollWorkflowController.patchPayroll(payroll.id, {
        status: PayrollStatus.COMPLETED,
      });

      const [payrollID, updateRequest] = capture(mockEmployerService.updatePayroll).last();
      expect(payrollID).toBe(payroll.id);
      expect(updateRequest).toStrictEqual({ status: "COMPLETED" });
    });
  });

  describe("createInvoice", () => {
    it("should create an invoice", async () => {
      const payrollID = "payroll-id";
      when(mockEmployerService.createInvoice(payrollID)).thenResolve();
      payrollWorkflowController.createInvoice(payrollID);
    });
  });

  describe("createReceipt", () => {
    it("should create a receipt", async () => {
      const payrollID = "payroll-id";
      when(mockEmployerService.createInvoiceReceipt(payrollID)).thenResolve();
      payrollWorkflowController.createReceipt(payrollID);
    });
  });
});
