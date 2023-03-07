import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { IEmployerRepo } from "../repo/employer.repo";
import { getMockEmployerRepoWithDefaults } from "../mocks/mock.employer.repo";
import {
  EMPLOYER_REPO_PROVIDER,
  PAYROLL_DISBURSEMENT_REPO_PROVIDER,
  PAYROLL_REPO_PROVIDER,
} from "../repo/employer.repo.module";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { uuid } from "uuidv4";
import { Employer } from "../domain/Employer";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { IPayrollRepo } from "../repo/payroll.repo";
import { IPayrollDisbursementRepo } from "../repo/payroll.disbursement.repo";
import { getMockPayrollDisbursementRepoWithDefaults } from "../mocks/mock.payroll.disbursement.repo";
import { getMockPayrollRepoWithDefaults } from "../mocks/mock.payroll.repo";
import { getRandomPayroll, getRandomPayrollDisbursement } from "../test_utils/payroll.test.utils";
import { PayrollStatus } from "../domain/Payroll";
import { getRandomEmployee } from "../../../modules/employee/test_utils/employee.test.utils";
import { Utils } from "../../../core/utils/Utils";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { TemplateService } from "../../../modules/common/template.service";
import { getMockTemplateServiceWithDefaults } from "../../../modules/common/mocks/mock.template.service";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    payrollAccountNumber: "111111111",
    payrollDates: ["2020-02-05", "2020-03-25"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

describe("EmployerServiceTests", () => {
  jest.setTimeout(20000);

  let employerRepo: IEmployerRepo;
  let app: TestingModule;
  let employerService: EmployerService;
  let employeeService: EmployeeService;
  let payrollRepo: IPayrollRepo;
  let payrollDisbursementRepo: IPayrollDisbursementRepo;
  let exchangeRateService: ExchangeRateService;
  let templateService: TemplateService;

  beforeEach(async () => {
    employerRepo = getMockEmployerRepoWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    payrollDisbursementRepo = getMockPayrollDisbursementRepoWithDefaults();
    payrollRepo = getMockPayrollRepoWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
    templateService = getMockTemplateServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EMPLOYER_REPO_PROVIDER,
          useFactory: () => instance(employerRepo),
        },
        {
          provide: PAYROLL_REPO_PROVIDER,
          useFactory: () => instance(payrollRepo),
        },
        {
          provide: PAYROLL_DISBURSEMENT_REPO_PROVIDER,
          useFactory: () => instance(payrollDisbursementRepo),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
        },
        {
          provide: TemplateService,
          useFactory: () => instance(templateService),
        },
        EmployerService,
      ],
    }).compile();

    employerService = app.get<EmployerService>(EmployerService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createEmployer", () => {
    it("should create an employer and 'always' send the 'COP' as allocationCurrency", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });
    });

    it("should create an employer with provided maxAllocationPercent", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
      });
    });

    it("should create an employer with no payroll dates", async () => {
      const employer = getRandomEmployer();
      delete employer.payrollDates;
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should create an employer with empty payroll dates", async () => {
      const employer = getRandomEmployer();
      employer.payrollDates = [];
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should set default 'leadDays' as '1' if not specified", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        payrollDates: employer.payrollDates,
      });

      employer.leadDays = 1;
      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: 1,
        payrollDates: employer.payrollDates,
      });
    });

    const invalidLeadDays = [0, -1, 6, 10];
    test.each(invalidLeadDays)("should throw ServiceException if leadDays is set to: %s", async invalidLeadDay => {
      const employer = getRandomEmployer();
      employer.leadDays = invalidLeadDay;

      try {
        await employerService.createEmployer({
          name: employer.name,
          logoURI: employer.logoURI,
          bubbleID: employer.bubbleID,
          referralID: employer.referralID,
          leadDays: employer.leadDays,
          payrollDates: employer.payrollDates,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
        expect(err.message).toEqual(expect.stringContaining("Lead days"));
      }
    });
  });

  describe("updateEmployer", () => {
    it("should update 'only' the logoURI of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        logoURI: "https://new-logo-uri.com",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: "https://new-logo-uri.com",
      });
    });

    it("should update 'only' the maxAllocationPercent of the employer", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toEqual(employer);
      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        maxAllocationPercent: 20,
      });
    });

    it("should update 'only' the referralID of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        referralID: "new-referral-id",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        referralID: "new-referral-id",
      });
    });

    it("should update 'only' the leadDays of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        leadDays: 4,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        leadDays: 4,
      });
    });

    const invalidLeadDays = [0, -1, 6, 10];
    test.each(invalidLeadDays)("should throw ServiceException if leadDays is set to: %s", async invalidLeadDay => {
      const employer = getRandomEmployer();
      employer.leadDays = invalidLeadDay;

      try {
        const updatedEmployer = await employerService.updateEmployer(employer.id, {
          leadDays: invalidLeadDay,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
        expect(err.message).toEqual(expect.stringContaining("Lead days"));
      }
    });

    it("should update 'only' the payrollDays of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const payrollDates = ["2020-03-04", "2020-03-18"];
      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        payrollDates: payrollDates,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        payrollDates: payrollDates,
      });
    });

    it("should update 'only' the payrollAccountNumber of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        payrollAccountNumber: "12345",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        payrollAccountNumber: "12345",
      });
    });

    it("should update all the fields", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const payrollDates = ["2020-03-17", "2020-03-30"];
      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        logoURI: "https://new-logo-uri.com",
        referralID: "new-referral-id",
        leadDays: 4,
        payrollAccountNumber: "12345",
        payrollDates: payrollDates,
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toStrictEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: "https://new-logo-uri.com",
        referralID: "new-referral-id",
        leadDays: 4,
        payrollAccountNumber: "12345",
        payrollDates: payrollDates,
        maxAllocationPercent: 20,
      });
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      try {
        await employerService.updateEmployer(undefined, {
          logoURI: "https://new-logo-uri.com",
          referralID: "new-referral-id",
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("ID"));
      }

      try {
        await employerService.updateEmployer(null, {
          logoURI: "https://new-logo-uri.com",
          referralID: "new-referral-id",
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("ID"));
      }
    });
  });

  describe("getEmployerByID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(employerRepo.getEmployerByID).last();
      expect(employerID).toEqual(employer.id);
      expect(retrievedEmployer.maxAllocationPercent).toBeUndefined();
    });

    it("should return 'maxAllocationPercent' when available", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(employerRepo.getEmployerByID).last();
      expect(employerID).toEqual(employer.id);
      expect(retrievedEmployer.maxAllocationPercent).toBe(20);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerByReferralID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.referralID);

      expect(retrievedEmployer).toEqual(employer);

      const [referralID] = capture(employerRepo.getEmployerByID).last();
      expect(referralID).toEqual(employer.referralID);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerByBubbleID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.bubbleID);

      expect(retrievedEmployer).toEqual(employer);

      const [bubbleID] = capture(employerRepo.getEmployerByID).last();
      expect(bubbleID).toEqual(employer.bubbleID);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerWithEmployees", () => {
    it("should return employer with employees", async () => {
      const employer = getRandomEmployer();
      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);

      when(employeeService.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2]);
      when(employerRepo.getEmployerByID(employer.id)).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerWithEmployees(employer.id, true);

      expect(retrievedEmployer).toStrictEqual({
        ...employer,
        employees: [employee1, employee2],
      });
    });

    it("should not return employees if flag is false", async () => {
      const employer = getRandomEmployer();
      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);

      when(employeeService.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2]);
      when(employerRepo.getEmployerByID(employer.id)).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerWithEmployees(employer.id, false);

      expect(retrievedEmployer).toStrictEqual({
        ...employer,
        employees: [],
      });
    });

    it("should throw ServiceException when 'employerID' is not defined", async () => {
      await expect(employerService.getEmployerWithEmployees(undefined, true)).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when employer does not exist", async () => {
      when(employerRepo.getEmployerByID(anything())).thenResolve(null);

      await expect(employerService.getEmployerWithEmployees("fake-id", true)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getPayrollByID", () => {
    it("should get payroll with the given id", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);

      when(payrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      const retrievedPayroll = await employerService.getPayrollByID(payroll.id);

      expect(retrievedPayroll).toStrictEqual(payroll);
    });

    it("should throw error when 'id' is not defined", async () => {
      await expect(employerService.getPayrollByID(undefined)).rejects.toThrowError(ServiceException);
    });

    it("should return null when payroll with id does not exist", async () => {
      when(payrollRepo.getPayrollByID(anything())).thenResolve(null);

      const retrievedPayroll = await employerService.getPayrollByID("fake-id");

      expect(retrievedPayroll).toBeNull();
    });
  });

  describe("createPayroll", () => {
    it("should create a payroll", async () => {
      const payrollDate = "2020-03-01";
      const employerID = "fake-employer";

      const { payroll } = getRandomPayroll(employerID);

      const spy = jest.spyOn(Utils, "generateLowercaseUUID").mockImplementation(() => "fake-uuid");

      when(payrollRepo.addPayroll(anything())).thenResolve(payroll);

      const response = await employerService.createPayroll(employerID, payrollDate);

      expect(response).toStrictEqual(payroll);

      const [payrollRequest] = capture(payrollRepo.addPayroll).last();
      expect(payrollRequest).toEqual({
        employerID: employerID,
        payrollDate: payrollDate,
        reference: "fake-uuid",
      });
      spy.mockRestore();
    });

    it("should throw ServiceException if 'employerID' is undefined", async () => {
      await expect(employerService.createPayroll(undefined, "2020-03-01")).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when payrollDate is not valid format", async () => {
      await expect(employerService.createPayroll("fake-employer", "2020/03/01")).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when payrollDate is not valid date", async () => {
      await expect(employerService.createPayroll("fake-employer", "2020-02-30")).rejects.toThrowError(ServiceException);
    });
  });

  describe("updatePayroll", () => {
    it("should update 'status' of payroll", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.INVOICED;

      when(payrollRepo.updatePayroll(anyString(), anything())).thenResolve(payroll);

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.INVOICED,
      });

      expect(updatedPayroll).toStrictEqual(payroll);

      const [payrollID, payrollUpdateRequest] = capture(payrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest).toEqual({
        status: PayrollStatus.INVOICED,
      });
      expect(payrollUpdateRequest.completedTimestamp).toBeUndefined();
    });

    it("should update 'status' and 'completedTimestamp' when status is COMPLETED", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.COMPLETED;

      when(payrollRepo.updatePayroll(anyString(), anything())).thenResolve(payroll);

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.COMPLETED,
      });
      expect(updatedPayroll).toStrictEqual(payroll);

      const [payrollID, payrollUpdateRequest] = capture(payrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest.status).toEqual(PayrollStatus.COMPLETED);
      expect(payrollUpdateRequest.completedTimestamp).toBeDefined();
    });

    it("should update payroll and set totalDebitAmount, totalCreditAmount and exchangeRate when status is CREATED", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.CREATED;
      const { payrollDisbursement: disbursement1 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-1");
      const { payrollDisbursement: disbursement2 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-2");

      disbursement1.debitAmount = 10000;
      disbursement2.debitAmount = 20000;

      when(payrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve([
        disbursement1,
        disbursement2,
      ]);

      when(exchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        nobaRate: 0.0025,
        bankRate: 0.0025,
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
      });

      when(payrollRepo.updatePayroll(anyString(), anything())).thenResolve(payroll);

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.CREATED,
      });

      expect(updatedPayroll).toStrictEqual(payroll);

      const [payrollID, payrollUpdateRequest] = capture(payrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest).toEqual({
        status: PayrollStatus.CREATED,
        totalDebitAmount: 30000,
        totalCreditAmount: 75,
        exchangeRate: 0.0025,
      });
    });

    it("should throw 'ServiceException' when id is undefined", async () => {
      await expect(
        employerService.updatePayroll(undefined, {
          status: PayrollStatus.COMPLETED,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("createDisbursement", () => {
    it("should create disbursement", async () => {
      const employee = getRandomEmployee("fake-employer");
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", employee.id);

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(payrollDisbursementRepo.createPayrollDisbursement(anything())).thenResolve(payrollDisbursement);

      const response = await employerService.createDisbursement("fake-payroll", {
        employeeID: employee.id,
      });

      expect(response).toStrictEqual(payrollDisbursement);

      const [disbursementRequest] = capture(payrollDisbursementRepo.createPayrollDisbursement).last();
      expect(disbursementRequest).toEqual({
        payrollID: "fake-payroll",
        employeeID: employee.id,
        debitAmount: employee.allocationAmount,
      });
    });

    it("should throw 'ServiceException' when payrollID is undefined", async () => {
      await expect(
        employerService.createDisbursement(undefined, {
          employeeID: "fake-employee",
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when employeeID is undefined", async () => {
      await expect(
        employerService.createDisbursement("fake-payroll", {
          employeeID: undefined,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when employee does not exist", async () => {
      when(employeeService.getEmployeeByID(anything())).thenResolve(null);

      await expect(
        employerService.createDisbursement("fake-payroll", {
          employeeID: "fake-employee",
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("updateDisbursement", () => {
    it("should update disbursement", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(payrollDisbursementRepo.getPayrollDisbursementByID(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(payrollDisbursementRepo.updatePayrollDisbursement(anyString(), anything())).thenResolve(payrollDisbursement);

      const response = await employerService.updateDisbursement(payrollDisbursement.payrollID, payrollDisbursement.id, {
        transactionID: "fake-transaction",
      });

      payrollDisbursement.transactionID = "fake-transaction";
      expect(response).toStrictEqual(payrollDisbursement);

      const [disbursementID, disbursementUpdateRequest] = capture(
        payrollDisbursementRepo.updatePayrollDisbursement,
      ).last();
      expect(disbursementID).toEqual(payrollDisbursement.id);
      expect(disbursementUpdateRequest).toEqual({
        transactionID: "fake-transaction",
      });
    });

    it("should throw 'ServiceException' when payrollID is undefined", async () => {
      await expect(
        employerService.updateDisbursement(undefined, "fake-disbursement", {
          transactionID: "fake-transaction",
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when disbursementID is undefined", async () => {
      await expect(
        employerService.updateDisbursement("fake-payroll", undefined, {
          transactionID: "fake-transaction",
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when disbursement does not exist", async () => {
      when(payrollDisbursementRepo.getPayrollDisbursementByID(anything())).thenResolve(null);

      await expect(
        employerService.updateDisbursement("fake-payroll", "fake-disbursement", {
          transactionID: "fake-transaction",
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when payroll id for disbursement is different", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(payrollDisbursementRepo.getPayrollDisbursementByID(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(payrollDisbursementRepo.updatePayrollDisbursement(anyString(), anything())).thenResolve(payrollDisbursement);

      await expect(
        async () =>
          await employerService.updateDisbursement("fake-payroll-2", payrollDisbursement.id, {
            transactionID: "fake-transaction",
          }),
      ).rejects.toThrow(ServiceException);
    });
  });
});
