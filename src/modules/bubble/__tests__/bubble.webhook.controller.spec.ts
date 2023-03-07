import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { BubbleWebhookController } from "../bubble.webhook.controller";
import { BubbleService } from "../bubble.service";
import { getMockBubbleServiceWithDefaults } from "../mocks/mock.bubble.service";
import {
  getRandomPayroll,
  getRandomPayrollDisbursement,
} from "../../../modules/employer/test_utils/payroll.test.utils";
import { BadRequestException } from "@nestjs/common";

describe("BubbleWebhookControllerTests", () => {
  jest.setTimeout(20000);

  let bubbleWebhookController: BubbleWebhookController;
  let bubbleService: BubbleService;
  let app: TestingModule;

  beforeEach(async () => {
    bubbleService = getMockBubbleServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: BubbleService,
          useFactory: () => instance(bubbleService),
        },
        BubbleWebhookController,
      ],
    }).compile();

    bubbleWebhookController = app.get<BubbleWebhookController>(BubbleWebhookController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("registerEmployer", () => {
    it("should forwards the request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWebhookController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
      });
    });

    it("should forwards the 'leadDays' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWebhookController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
      });
    });

    it("should forwards the 'maxAllocationPercent' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
        maxAllocationPercent: 10,
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWebhookController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
        maxAllocationPercent: 10,
      });
    });

    it("should forward the 'payrollDates' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        payrollDates: ["2020-03-01"],
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWebhookController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        payrollDates: requestBody.payrollDates,
      });
    });
  });

  describe("updateEmployer", () => {
    it("should forwards the request to the BubbleService", async () => {
      const referralID = "referralID";
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        maxAllocationPercent: 10,
      };
      when(bubbleService.updateEmployerInNoba(anyString(), anything())).thenResolve();

      await bubbleWebhookController.updateEmployer(requestBody, referralID);

      const [bubbleServiceUpdateEmployerInNobaReferralIDArgs, bubbleServiceUpdateEmployerInNobaRequestBodyArgs] =
        capture(bubbleService.updateEmployerInNoba).last();
      expect(bubbleServiceUpdateEmployerInNobaReferralIDArgs).toEqual("referralID");
      expect(bubbleServiceUpdateEmployerInNobaRequestBodyArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        maxAllocationPercent: 10,
      });
    });
  });

  describe("updateEmployee", () => {
    it("should forwards the request to the BubbleService", async () => {
      const employeeID = "employeeID";
      const requestBody = {
        salary: 1000,
      };

      when(bubbleService.updateEmployee(anyString(), anything())).thenResolve();

      await bubbleWebhookController.updateEmployee(requestBody, employeeID);

      const [bubbleServiceUpdateEmployeeEmployeeIDArgs, bubbleServiceUpdateEmployeeRequestBodyArgs] = capture(
        bubbleService.updateEmployee,
      ).last();
      expect(bubbleServiceUpdateEmployeeEmployeeIDArgs).toEqual("employeeID");
      expect(bubbleServiceUpdateEmployeeRequestBodyArgs).toEqual({
        salary: 1000,
      });
    });
  });

  describe("createPayroll", () => {
    it("should return payroll id after creation", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.createPayroll(referralID, payroll.payrollDate)).thenResolve(payroll);

      const result = await bubbleWebhookController.createPayroll(referralID, { payrollDate: payroll.payrollDate });

      expect(result).toStrictEqual({ payrollID: payroll.id });
    });

    it("should throw 'BadRequestException' when payrollDate is malformed", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.createPayroll(referralID, payroll.payrollDate)).thenResolve(payroll);
      await expect(
        async () => await bubbleWebhookController.createPayroll(referralID, { payrollDate: "01/01/2020" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw 'BadRequestException' when payrollDate is not a valid date", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.createPayroll(referralID, payroll.payrollDate)).thenResolve(payroll);

      await expect(
        async () => await bubbleWebhookController.createPayroll(referralID, { payrollDate: "2020-01-32" }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        async () => await bubbleWebhookController.createPayroll(referralID, { payrollDate: "2020-01-32" }),
      ).rejects.toThrow("Invalid payrollDate");
    });

    it("should throw 'BadRequestException' when payrollDate does not account for leap year", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.createPayroll(referralID, payroll.payrollDate)).thenResolve(payroll);

      await expect(
        async () => await bubbleWebhookController.createPayroll(referralID, { payrollDate: "2021-02-29" }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        async () => await bubbleWebhookController.createPayroll(referralID, { payrollDate: "2021-02-29" }),
      ).rejects.toThrow("Invalid payrollDate");
    });
  });

  describe("getAllPayrolls", () => {
    it("should get all payrolls for employer", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.getAllPayrollsForEmployer(referralID)).thenResolve([payroll]);

      const result = await bubbleWebhookController.getAllPayrolls(referralID);

      expect(result).toStrictEqual([
        {
          payrollID: payroll.id,
          payrollDate: payroll.payrollDate,
          status: payroll.status,
          reference: payroll.reference,
          ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
          ...(payroll.totalDebitAmount && { totalDebitAmount: payroll.totalDebitAmount }),
          ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
          ...(payroll.debitCurrency && { debitCurrency: payroll.debitCurrency }),
          ...(payroll.creditCurrency && { creditCurrency: payroll.creditCurrency }),
          ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
        },
      ]);
    });
  });

  describe("getPayroll", () => {
    it("should return payroll with disbursement", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      const { payrollDisbursement } = getRandomPayrollDisbursement(payroll.id, "fake-employee-id");

      when(bubbleService.getPayrollWithDisbursements(referralID, payroll.id, true)).thenResolve({
        ...payroll,
        disbursements: [payrollDisbursement],
      });

      const result = await bubbleWebhookController.getPayroll(referralID, payroll.id, {
        shouldIncludeDisbursements: true,
      });

      expect(result).toStrictEqual({
        payrollID: payroll.id,
        payrollDate: payroll.payrollDate,
        status: payroll.status,
        reference: payroll.reference,
        ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
        ...(payroll.totalDebitAmount && { totalDebitAmount: payroll.totalDebitAmount }),
        ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
        ...(payroll.debitCurrency && { debitCurrency: payroll.debitCurrency }),
        ...(payroll.creditCurrency && { creditCurrency: payroll.creditCurrency }),
        ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
        disbursements: [
          {
            id: payrollDisbursement.id,
            employeeID: payrollDisbursement.employeeID,
            transactionID: payrollDisbursement.transactionID,
            debitAmount: payrollDisbursement.debitAmount,
          },
        ],
      });
    });
  });

  describe("getAllDisbursementsForEmployee", () => {
    it("should get all disbursements for employee", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";
      const employeeID = "fake-employee-id";

      const { payrollDisbursement } = getRandomPayrollDisbursement(payroll.id, employeeID);

      when(bubbleService.getAllDisbursementsForEmployee(referralID, employeeID)).thenResolve([payrollDisbursement]);

      const result = await bubbleWebhookController.getAllDisbursementsForEmployee(referralID, employeeID);

      expect(result).toStrictEqual([
        {
          id: payrollDisbursement.id,
          employeeID: payrollDisbursement.employeeID,
          transactionID: payrollDisbursement.transactionID,
          debitAmount: payrollDisbursement.debitAmount,
        },
      ]);
    });
  });
});
