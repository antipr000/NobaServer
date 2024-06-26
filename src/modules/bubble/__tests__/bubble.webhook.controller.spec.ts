import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { BubbleWebhookController } from "../bubble.webhook.controller";
import { BubbleService } from "../bubble.service";
import { getMockBubbleServiceWithDefaults } from "../mocks/mock.bubble.service";
import {
  getRandomPayroll,
  getRandomPayrollDisbursement,
} from "../../../modules/employer/test_utils/payroll.test.utils";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { getRandomEmployer } from "../../../modules/employer/test_utils/employer.test.utils";
import { getRandomEmployee } from "../../../modules/employee/test_utils/employee.test.utils";
import { getRandomActiveConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { EmployeeStatus } from "../../../modules/employee/domain/Employee";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";
import { RegisterEmployerRequestDTO, UpdateEmployerRequestDTO } from "../dto/bubble.webhook.controller.dto";

describe("BubbleWebhookControllerTests", () => {
  jest.setTimeout(20000);

  let bubbleWebhookController: BubbleWebhookController;
  let workflowExecutor: WorkflowExecutor;
  let bubbleService: BubbleService;
  let app: TestingModule;

  beforeEach(async () => {
    bubbleService = getMockBubbleServiceWithDefaults();
    workflowExecutor = getMockWorkflowExecutorWithDefaults();

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
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
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

    it("should forwards the 'documentNumber' and 'depositMatchingName' in request to the BubbleService", async () => {
      const requestBody: RegisterEmployerRequestDTO = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        documentNumber: "documentNumber",
        depositMatchingName: "depositMatchingName",
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
        documentNumber: "documentNumber",
        depositMatchingName: "depositMatchingName",
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
      const requestBody: UpdateEmployerRequestDTO = {
        logoURI: "logoURI",
        maxAllocationPercent: 10,
        depositMatchingName: "depositMatchingName",
        documentNumber: "documentNumber",
      };
      when(bubbleService.updateEmployerInNoba(anyString(), anything())).thenResolve();

      await bubbleWebhookController.updateEmployer(requestBody, referralID);

      const [bubbleServiceUpdateEmployerInNobaReferralIDArgs, bubbleServiceUpdateEmployerInNobaRequestBodyArgs] =
        capture(bubbleService.updateEmployerInNoba).last();
      expect(bubbleServiceUpdateEmployerInNobaReferralIDArgs).toEqual("referralID");
      expect(bubbleServiceUpdateEmployerInNobaRequestBodyArgs).toStrictEqual({
        logoURI: "logoURI",
        maxAllocationPercent: 10,
        depositMatchingName: "depositMatchingName",
        documentNumber: "documentNumber",
      });
    });
  });

  describe("updateEmployee", () => {
    it("should forward the request to the BubbleService for salary update", async () => {
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

    it("should forward the request to the BubbleService for status update", async () => {
      const employeeID = "employeeID";
      const requestBody = {
        status: EmployeeStatus.UNLINKED,
      };

      when(bubbleService.updateEmployee(anyString(), anything())).thenResolve();

      await bubbleWebhookController.updateEmployee(requestBody, employeeID);

      const [bubbleServiceUpdateEmployeeEmployeeIDArgs, bubbleServiceUpdateEmployeeRequestBodyArgs] = capture(
        bubbleService.updateEmployee,
      ).last();
      expect(bubbleServiceUpdateEmployeeEmployeeIDArgs).toEqual("employeeID");
      expect(bubbleServiceUpdateEmployeeRequestBodyArgs).toStrictEqual({
        status: EmployeeStatus.UNLINKED,
      });
    });

    it("should forward the request to the BubbleService for all fields update", async () => {
      const employeeID = "employeeID";
      const requestBody = {
        salary: 1000,
        status: EmployeeStatus.UNLINKED,
      };

      when(bubbleService.updateEmployee(anyString(), anything())).thenResolve();

      await bubbleWebhookController.updateEmployee(requestBody, employeeID);

      const [bubbleServiceUpdateEmployeeEmployeeIDArgs, bubbleServiceUpdateEmployeeRequestBodyArgs] = capture(
        bubbleService.updateEmployee,
      ).last();
      expect(bubbleServiceUpdateEmployeeEmployeeIDArgs).toEqual("employeeID");
      expect(bubbleServiceUpdateEmployeeRequestBodyArgs).toEqual({
        salary: 1000,
        status: EmployeeStatus.UNLINKED,
      });
    });
  });

  describe("createPayroll", () => {
    it("should return payroll id after creation", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.createPayroll(referralID, payroll.payrollDate)).thenResolve(payroll);
      when(
        workflowExecutor.executePayrollProcessingWorkflow(
          payroll.id,
          "fake-employer-name",
          payroll.payrollDate,
          payroll.id,
        ),
      ).thenResolve(null);

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
          reference: payroll.referenceNumber.toString(),
          payrollISODate: new Date(`${payroll.payrollDate}T12:00:00.000Z`),
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

      when(bubbleService.getPayroll(referralID, payroll.id)).thenResolve({
        ...payroll,
      });

      const result = await bubbleWebhookController.getPayroll(referralID, payroll.id);

      expect(result).toStrictEqual({
        payrollID: payroll.id,
        payrollDate: payroll.payrollDate,
        status: payroll.status,
        reference: payroll.referenceNumber.toString(),
        payrollISODate: new Date(`${payroll.payrollDate}T12:00:00.000Z`),
        ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
        ...(payroll.totalDebitAmount && { totalDebitAmount: payroll.totalDebitAmount }),
        ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
        ...(payroll.debitCurrency && { debitCurrency: payroll.debitCurrency }),
        ...(payroll.creditCurrency && { creditCurrency: payroll.creditCurrency }),
        ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
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
          debitAmount: payrollDisbursement.allocationAmount,
        },
      ]);
    });
  });

  describe("getAllEmployees", () => {
    it("should get all employees for employer", async () => {
      const employer = getRandomEmployer("Fake Employer");
      const employee = getRandomEmployee(employer.id);
      const consumer = getRandomActiveConsumer("57", "CO");

      employee.consumer = consumer;
      employee.consumerID = consumer.props.id;

      when(bubbleService.getAllEmployeesForEmployer(employer.referralID, deepEqual({}))).thenResolve({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [employee],
      });

      const result = await bubbleWebhookController.getAllEmployees(employer.referralID, {});

      expect(result).toStrictEqual({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [
          {
            id: employee.id,
            allocationAmount: employee.allocationAmount,
            allocationCurrency: employee.allocationCurrency,
            employerID: employee.employerID,
            consumerID: employee.consumerID,
            salary: employee.salary,
            email: employee.email,
            status: employee.status,
            firstName: employee.consumer.props.firstName,
            lastName: employee.consumer.props.lastName,
            phoneNumber: employee.consumer.props.phone,
            consumerEmail: employee.consumer.props.email,
            handle: employee.consumer.props.handle,
          },
        ],
      });
    });
    it("should get all employees for employer even if no consumer attached", async () => {
      const employer = getRandomEmployer("Fake Employer");
      const employee = getRandomEmployee(employer.id);
      const consumer = getRandomActiveConsumer("57", "CO");

      //employee.consumer = consumer;
      //employee.consumerID = consumer.props.id;

      when(bubbleService.getAllEmployeesForEmployer(employer.referralID, deepEqual({}))).thenResolve({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [employee],
      });

      const result = await bubbleWebhookController.getAllEmployees(employer.referralID, {});

      expect(result).toStrictEqual({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [
          {
            id: employee.id,
            allocationAmount: employee.allocationAmount,
            allocationCurrency: employee.allocationCurrency,
            employerID: employee.employerID,
            consumerID: employee.consumerID,
            salary: employee.salary,
            email: employee.email,
            status: employee.status,
          },
        ],
      });
    });
  });

  describe("createEmployee", () => {
    it("should create and return employee", async () => {
      const employer = getRandomEmployer("Fake Employer");
      const employee = getRandomEmployee(employer.id);
      employee.email = "fake-email@noba.com";
      employee.status = EmployeeStatus.INVITED;

      when(
        bubbleService.createEmployeeForEmployer(
          employer.referralID,
          deepEqual({
            email: employee.email,
            sendEmail: true,
          }),
        ),
      ).thenResolve(employee);

      const result = await bubbleWebhookController.createEmployee(employer.referralID, {
        email: employee.email,
        sendEmail: true,
      });

      expect(result).toStrictEqual({
        id: employee.id,
        allocationAmount: employee.allocationAmount,
        allocationCurrency: employee.allocationCurrency,
        employerID: employee.employerID,
        status: employee.status,
      });
    });
  });

  describe("getAllEnrichedDisbursementsForPayroll", () => {
    it("should get all enriched disbursements for payroll empty filters", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      const enrichedDisbursement = {
        id: "fake-id",
        debitAmount: 1000,
        creditAmount: 1000,
        status: TransactionStatus.COMPLETED,
        firstName: "Fake",
        lastName: "Fake",
        updatedTimestamp: new Date(),
      };

      when(bubbleService.getAllEnrichedDisbursementsForPayroll(referralID, payroll.id, null)).thenResolve({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [enrichedDisbursement],
      });

      expect(
        bubbleWebhookController.getAllEnrichedDisbursementsForPayroll(referralID, payroll.id, null),
      ).resolves.toEqual({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [
          {
            id: enrichedDisbursement.id,
            debitAmount: enrichedDisbursement.debitAmount,
            creditAmount: enrichedDisbursement.creditAmount,
            status: enrichedDisbursement.status,
            firstName: enrichedDisbursement.firstName,
            lastName: enrichedDisbursement.lastName,
            updatedTimestamp: enrichedDisbursement.updatedTimestamp,
          },
        ],
      });
    });

    it("should get all enriched disbursements for payroll with filters", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      const enrichedDisbursement = {
        id: "fake-id",
        debitAmount: 1000,
        creditAmount: 1000,
        status: TransactionStatus.COMPLETED,
        firstName: "Fake",
        lastName: "Fake",
        updatedTimestamp: new Date(),
      };

      when(
        bubbleService.getAllEnrichedDisbursementsForPayroll(
          referralID,
          payroll.id,
          deepEqual({
            status: TransactionStatus.COMPLETED,
          }),
        ),
      ).thenResolve({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [enrichedDisbursement],
      });

      expect(
        bubbleWebhookController.getAllEnrichedDisbursementsForPayroll(referralID, payroll.id, {
          status: TransactionStatus.COMPLETED,
        }),
      ).resolves.toEqual({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [
          {
            id: enrichedDisbursement.id,
            debitAmount: enrichedDisbursement.debitAmount,
            creditAmount: enrichedDisbursement.creditAmount,
            status: enrichedDisbursement.status,
            firstName: enrichedDisbursement.firstName,
            lastName: enrichedDisbursement.lastName,
            updatedTimestamp: enrichedDisbursement.updatedTimestamp,
          },
        ],
      });
    });

    it("should throw NotFoundException if paginated response is empty", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      const referralID = "fake-referral";

      when(bubbleService.getAllEnrichedDisbursementsForPayroll(referralID, payroll.id, null)).thenResolve({
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 0,
        items: [],
      });

      expect(
        bubbleWebhookController.getAllEnrichedDisbursementsForPayroll(referralID, payroll.id, null),
      ).rejects.toThrow(NotFoundException);
    });
  });
  describe("sendInviteToEmployees", () => {
    it("should invite multiple employees", async () => {
      const employer = getRandomEmployer("Fake Employer");

      const file: Express.Multer.File = {} as any;

      when(bubbleService.bulkInviteEmployeesForEmployer(anyString(), anything())).thenResolve();

      await bubbleWebhookController.sendInviteToEmployees(employer.referralID, file);

      verify(bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, deepEqual(file))).once();
    });
  });
});
