import * as TemplateProcessModule from "../../../modules/common/utils/template.processor";
import { getMockTemplateProcessorWithDefaults } from "../../../modules/common/mocks/mock.template.processor";
const mockTemplateProcessor = getMockTemplateProcessorWithDefaults();
const constructorSpy = jest.spyOn(TemplateProcessModule, "TemplateProcessor");

import { Test, TestingModule } from "@nestjs/testing";
import {
  NOBA_CONFIG_KEY,
  NOBA_PAYROLL_ACCOUNT_NUMBER,
  NOBA_PAYROLL_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { IEmployerRepo } from "../repo/employer.repo";
import { getMockEmployerRepoWithDefaults } from "../mocks/mock.employer.repo";
import {
  EMPLOYER_REPO_PROVIDER,
  PAYROLL_DISBURSEMENT_REPO_PROVIDER,
  PAYROLL_REPO_PROVIDER,
} from "../repo/employer.repo.module";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
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
import { S3Service } from "../../common/s3.service";
import { getMockS3ServiceWithDefaults } from "../../common/mocks/mock.s3.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { KmsService } from "../../../modules/common/kms.service";
import { getMockKMSServiceWithDefaults } from "../../../modules/common/mocks/mock.kms.service";
import { InvoiceReceiptTemplateFields, InvoiceTemplateFields } from "../templates/payroll.invoice.dto";
import dayjs from "dayjs";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { PayrollDisbursement } from "../domain/PayrollDisbursement";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/exchangerate/mocks/mock.exchangerate.service";
import { ExchangeRateService } from "../../../modules/exchangerate/exchangerate.service";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    documentNumber: uuid(),
    referralID: uuid(),
    leadDays: 5,
    payrollAccountNumber: "111111111",
    payrollDates: ["2020-02-05", "2020-03-25"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

const amountStrEnglish100 = Number(100).toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
  minimumFractionDigits: 2,
});
const creditAmountStrEnglishDecimal = Number(65.5392).toLocaleString(
  TemplateProcessModule.TemplateLocale.ENGLISH.toString(),
  {
    minimumFractionDigits: 2,
  },
);
const amountStrSpanish100 = Number(100).toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
  minimumFractionDigits: 2,
});
const creditAmountStrSpanishDecimal = Number(65.5392).toLocaleString(
  TemplateProcessModule.TemplateLocale.SPANISH.toString(),
  {
    minimumFractionDigits: 2,
  },
);

describe("EmployerServiceTests", () => {
  jest.setTimeout(20000);

  let mockEmployerRepo: IEmployerRepo;
  let app: TestingModule;
  let employerService: EmployerService;
  let mockEmployeeService: EmployeeService;
  let mockConsumerService: ConsumerService;
  let mockPayrollRepo: IPayrollRepo;
  let mockPayrollDisbursementRepo: IPayrollDisbursementRepo;
  let mockExchangeRateService: ExchangeRateService;
  let mockS3Service: S3Service;
  let mockKMSService: KmsService;
  let mockWorkflowExecutor: WorkflowExecutor;
  let mockTemplateProcessorInstance;

  beforeEach(async () => {
    mockEmployerRepo = getMockEmployerRepoWithDefaults();
    mockEmployeeService = getMockEmployeeServiceWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();
    mockPayrollDisbursementRepo = getMockPayrollDisbursementRepoWithDefaults();
    mockPayrollRepo = getMockPayrollRepoWithDefaults();
    mockExchangeRateService = getMockExchangeRateServiceWithDefaults();
    mockS3Service = getMockS3ServiceWithDefaults();
    mockKMSService = getMockKMSServiceWithDefaults();
    mockWorkflowExecutor = getMockWorkflowExecutorWithDefaults();
    mockTemplateProcessorInstance = instance(mockTemplateProcessor);
    constructorSpy.mockImplementationOnce(() => mockTemplateProcessorInstance);
    mockTemplateProcessorInstance.locales = new Set();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        [NOBA_PAYROLL_CONFIG_KEY]: {
          [NOBA_PAYROLL_ACCOUNT_NUMBER]: "fake-acct-number",
        },
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EMPLOYER_REPO_PROVIDER,
          useFactory: () => instance(mockEmployerRepo),
        },
        {
          provide: PAYROLL_REPO_PROVIDER,
          useFactory: () => instance(mockPayrollRepo),
        },
        {
          provide: PAYROLL_DISBURSEMENT_REPO_PROVIDER,
          useFactory: () => instance(mockPayrollDisbursementRepo),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(mockEmployeeService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        {
          provide: S3Service,
          useFactory: () => instance(mockS3Service),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(mockConsumerService),
        },
        {
          provide: KmsService,
          useFactory: () => instance(mockKMSService),
        },
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(mockWorkflowExecutor),
        },
        EmployerService,
      ],
    }).compile();

    employerService = app.get<EmployerService>(EmployerService);
  });

  afterAll(() => {
    //jest.clearAllMocks();
    app.close();
  });

  afterEach(() => {
    constructorSpy.mockReset();
  });

  describe("createEmployer", () => {
    it("should create an employer and 'always' send the 'COP' as allocationCurrency", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(mockEmployerRepo.createEmployer).last();
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
      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

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

      const [propagatedEmployerCreateRequest] = capture(mockEmployerRepo.createEmployer).last();
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
      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

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
      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should create an employer with no documentNumber", async () => {
      const employer = getRandomEmployer();
      delete employer.documentNumber;

      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollAccountNumber: employer.payrollAccountNumber,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should set default 'leadDays' as '1' if not specified", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        payrollDates: employer.payrollDates,
      });

      employer.leadDays = 1;
      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(mockEmployerRepo.createEmployer).last();
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
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        logoURI: "https://new-logo-uri.com",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: "https://new-logo-uri.com",
      });
    });

    it("should update 'only' the maxAllocationPercent of the employer", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toEqual(employer);
      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        maxAllocationPercent: 20,
      });
    });

    it("should update 'only' the referralID of the employer", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        referralID: "new-referral-id",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        referralID: "new-referral-id",
      });
    });

    it("should update 'only' the leadDays of the employer", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        leadDays: 4,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        leadDays: 4,
      });
    });

    it("should update 'only' the documentNumber of the employer", async () => {
      const employer = getRandomEmployer();
      const newDocumentNumber = uuid();

      employer.documentNumber = newDocumentNumber;
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        documentNumber: newDocumentNumber,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        documentNumber: newDocumentNumber,
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
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const payrollDates = ["2020-03-04", "2020-03-18"];
      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        payrollDates: payrollDates,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        payrollDates: payrollDates,
      });
    });

    it("should update 'only' the payrollAccountNumber of the employer", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        payrollAccountNumber: "12345",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        payrollAccountNumber: "12345",
      });
    });

    it("should update all the fields", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

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

      const [employerID, propagatedEmployerUpdateRequest] = capture(mockEmployerRepo.updateEmployer).last();
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
    it("should throw ServiceException if 'id' is not provided", async () => {
      try {
        await employerService.getEmployerByID(null);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
      }

      try {
        await employerService.getEmployerByID(undefined);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(mockEmployerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(mockEmployerRepo.getEmployerByID).last();
      expect(employerID).toEqual(employer.id);
      expect(retrievedEmployer.maxAllocationPercent).toBeUndefined();
    });

    it("should return 'maxAllocationPercent' when available", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(mockEmployerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(mockEmployerRepo.getEmployerByID).last();
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
      when(mockEmployerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.referralID);

      expect(retrievedEmployer).toEqual(employer);

      const [referralID] = capture(mockEmployerRepo.getEmployerByID).last();
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
      when(mockEmployerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.bubbleID);

      expect(retrievedEmployer).toEqual(employer);

      const [bubbleID] = capture(mockEmployerRepo.getEmployerByID).last();
      expect(bubbleID).toEqual(employer.bubbleID);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getAllEmployees", () => {
    it("should throw ServiceException if no 'employerID' is specified", async () => {
      const employer = getRandomEmployer();
      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);

      when(mockEmployeeService.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2]);

      try {
        await employerService.getAllEmployees(null);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should return all the employees for the specified employer", async () => {
      const employer = getRandomEmployer();
      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);

      when(mockEmployeeService.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2]);
      when(mockConsumerService.isActiveConsumer(anything())).thenReturn(true);
      const retrievedEmployer = await employerService.getAllEmployees(employer.id);

      expect(retrievedEmployer).toStrictEqual([employee1, employee2]);
    });

    it("should return no active employees for the specified employer", async () => {
      const employer = getRandomEmployer();
      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);

      when(mockEmployeeService.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2]);
      when(mockConsumerService.isActiveConsumer(anything())).thenReturn(false);
      const retrievedEmployer = await employerService.getAllEmployees(employer.id);

      expect(retrievedEmployer).toStrictEqual([]);
    });
  });

  describe("getPayrollByID", () => {
    it("should get payroll with the given id", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      const retrievedPayroll = await employerService.getPayrollByID(payroll.id);

      expect(retrievedPayroll).toStrictEqual(payroll);
    });

    it("should throw error when 'id' is not defined", async () => {
      await expect(employerService.getPayrollByID(undefined)).rejects.toThrowError(ServiceException);
    });

    it("should return null when payroll with id does not exist", async () => {
      when(mockPayrollRepo.getPayrollByID(anything())).thenResolve(null);

      const retrievedPayroll = await employerService.getPayrollByID("fake-id");

      expect(retrievedPayroll).toBeNull();
    });
  });

  describe("getAllPayrollsForEmployer", () => {
    it("should get all payrolls for employer", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);

      when(mockPayrollRepo.getAllPayrollsForEmployer(employerID, deepEqual({}))).thenResolve([payroll]);

      const retrievedPayrolls = await employerService.getAllPayrollsForEmployer(employerID);

      expect(retrievedPayrolls).toStrictEqual([payroll]);
    });

    it("should throw error when 'employerID' is not defined", async () => {
      await expect(employerService.getAllPayrollsForEmployer(undefined)).rejects.toThrowError(ServiceException);
    });
  });

  describe("createPayroll", () => {
    it("should create a payroll", async () => {
      const payrollDate = "2020-03-01";
      const employerID = "fake-employer";

      const { payroll } = getRandomPayroll(employerID);

      const spy = jest.spyOn(Utils, "generateLowercaseUUID").mockImplementation(() => "fake-uuid");

      when(mockPayrollRepo.addPayroll(anything())).thenResolve(payroll);

      const response = await employerService.createPayroll(employerID, payrollDate);

      expect(response).toStrictEqual(payroll);

      const [payrollRequest] = capture(mockPayrollRepo.addPayroll).last();
      expect(payrollRequest).toEqual({
        employerID: employerID,
        payrollDate: payrollDate,
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
      payroll.status = PayrollStatus.PREPARED;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockPayrollRepo.updatePayroll(anyString(), anything())).thenResolve({
        ...payroll,
        status: PayrollStatus.INVOICED,
      });

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.INVOICED,
      });

      expect(updatedPayroll).toStrictEqual({
        ...payroll,
        status: PayrollStatus.INVOICED,
      });

      const [payrollID, payrollUpdateRequest] = capture(mockPayrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest).toEqual({
        status: PayrollStatus.INVOICED,
      });
      expect(payrollUpdateRequest.completedTimestamp).toBeUndefined();
    });

    it("should update 'status' and 'completedTimestamp' when status is COMPLETED", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.RECEIPT;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      when(mockPayrollRepo.updatePayroll(anyString(), anything())).thenResolve({
        ...payroll,
        status: PayrollStatus.COMPLETED,
      });

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.COMPLETED,
      });
      expect(updatedPayroll).toStrictEqual({
        ...payroll,
        status: PayrollStatus.COMPLETED,
      });

      const [payrollID, payrollUpdateRequest] = capture(mockPayrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest.status).toEqual(PayrollStatus.COMPLETED);
      expect(payrollUpdateRequest.completedTimestamp).toBeDefined();
    });

    it("should update payroll and set totalDebitAmount, totalCreditAmount and exchangeRate when status is PREPARED", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.CREATED;
      const { payrollDisbursement: disbursement1 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-1");
      const { payrollDisbursement: disbursement2 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-2");

      disbursement1.allocationAmount = 10000;
      disbursement2.allocationAmount = 20000;

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve([
        disbursement1,
        disbursement2,
      ]);

      when(mockExchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        nobaRate: 0.0025,
        bankRate: 0.0025,
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
      });

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockPayrollRepo.updatePayroll(anyString(), anything())).thenResolve(payroll);

      const updatedPayroll = await employerService.updatePayroll(payroll.id, {
        status: PayrollStatus.PREPARED,
      });

      expect(updatedPayroll).toStrictEqual(payroll);

      const [payrollID, payrollUpdateRequest] = capture(mockPayrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest).toEqual({
        status: PayrollStatus.PREPARED,
        totalDebitAmount: 30000,
        totalCreditAmount: 75,
        exchangeRate: 0.0025,
        debitCurrency: "COP",
        creditCurrency: "USD",
      });
    });

    it.each([
      [PayrollStatus.CREATED, PayrollStatus.PREPARED],
      [PayrollStatus.PREPARED, PayrollStatus.INVOICED],
      [PayrollStatus.INVOICED, PayrollStatus.FUNDED],
      [PayrollStatus.INVESTIGATION, PayrollStatus.FUNDED],
      [PayrollStatus.CREATED, PayrollStatus.FUNDED],
      [PayrollStatus.PREPARED, PayrollStatus.FUNDED],
      [PayrollStatus.INVOICED, PayrollStatus.INVESTIGATION],
      [PayrollStatus.FUNDED, PayrollStatus.INVESTIGATION],
      [PayrollStatus.FUNDED, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.RECEIPT],
      [PayrollStatus.RECEIPT, PayrollStatus.COMPLETED],
      [PayrollStatus.CREATED, PayrollStatus.EXPIRED],
      [PayrollStatus.INVOICED, PayrollStatus.EXPIRED],
      [PayrollStatus.INVESTIGATION, PayrollStatus.EXPIRED],
    ])("should allow status to be updated from %s to %s", async (fromStatus, toStatus) => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = fromStatus;

      const { payrollDisbursement: disbursement1 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-1");
      const { payrollDisbursement: disbursement2 } = getRandomPayrollDisbursement(payroll.id, "fake-employee-2");

      disbursement1.allocationAmount = 10000;
      disbursement2.allocationAmount = 20000;

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve([
        disbursement1,
        disbursement2,
      ]);

      when(mockExchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        nobaRate: 0.0025,
        bankRate: 0.0025,
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
      });

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockPayrollRepo.updatePayroll(anyString(), anything())).thenResolve({
        ...payroll,
        status: toStatus,
      });

      const response = await employerService.updatePayroll(payroll.id, {
        status: toStatus,
      });

      expect(response).toStrictEqual({
        ...payroll,
        status: toStatus,
      });

      const [payrollID, payrollUpdateRequest] = capture(mockPayrollRepo.updatePayroll).last();
      expect(payrollID).toEqual(payroll.id);
      expect(payrollUpdateRequest.status).toEqual(toStatus);
    });

    it.each([
      [PayrollStatus.INVOICED, PayrollStatus.PREPARED],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.PREPARED],
      [PayrollStatus.COMPLETED, PayrollStatus.PREPARED],
      [PayrollStatus.FUNDED, PayrollStatus.PREPARED],
      [PayrollStatus.EXPIRED, PayrollStatus.PREPARED],
      [PayrollStatus.INVESTIGATION, PayrollStatus.PREPARED],
      [PayrollStatus.CREATED, PayrollStatus.INVOICED],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.INVOICED],
      [PayrollStatus.COMPLETED, PayrollStatus.INVOICED],
      [PayrollStatus.FUNDED, PayrollStatus.INVOICED],
      [PayrollStatus.EXPIRED, PayrollStatus.INVOICED],
      [PayrollStatus.INVESTIGATION, PayrollStatus.INVOICED],
      [PayrollStatus.CREATED, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.PREPARED, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.INVOICED, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.COMPLETED, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.INVESTIGATION, PayrollStatus.IN_PROGRESS],
      [PayrollStatus.COMPLETED, PayrollStatus.FUNDED],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.FUNDED],
      [PayrollStatus.EXPIRED, PayrollStatus.FUNDED],
      [PayrollStatus.COMPLETED, PayrollStatus.INVESTIGATION],
      [PayrollStatus.PREPARED, PayrollStatus.INVESTIGATION],
      [PayrollStatus.EXPIRED, PayrollStatus.INVESTIGATION],
      [PayrollStatus.PREPARED, PayrollStatus.EXPIRED],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.EXPIRED],
      [PayrollStatus.IN_PROGRESS, PayrollStatus.EXPIRED],
      [PayrollStatus.CREATED, PayrollStatus.RECEIPT],
      [PayrollStatus.PREPARED, PayrollStatus.RECEIPT],
      [PayrollStatus.COMPLETED, PayrollStatus.RECEIPT],
      [PayrollStatus.FUNDED, PayrollStatus.RECEIPT],
      [PayrollStatus.EXPIRED, PayrollStatus.RECEIPT],
      [PayrollStatus.INVESTIGATION, PayrollStatus.RECEIPT],
      [PayrollStatus.CREATED, PayrollStatus.COMPLETED],
      [PayrollStatus.INVOICED, PayrollStatus.COMPLETED],
      [PayrollStatus.FUNDED, PayrollStatus.COMPLETED],
      [PayrollStatus.EXPIRED, PayrollStatus.COMPLETED],
      [PayrollStatus.INVESTIGATION, PayrollStatus.COMPLETED],
    ])("should not update status from %s to %s", async (fromStatus, toStatus) => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = fromStatus;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      const response = await employerService.updatePayroll(payroll.id, {
        status: toStatus,
      });

      expect(response).toStrictEqual(payroll);
      verify(mockPayrollRepo.updatePayroll(anyString(), anything())).never();
    });

    it("should throw ServiceException when status is not within allowed PayrollStatus values", async () => {
      const employerID = "fake-employer";
      const { payroll } = getRandomPayroll(employerID);
      payroll.status = PayrollStatus.CREATED;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      await expect(
        employerService.updatePayroll(payroll.id, {
          status: "fake-status" as PayrollStatus,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when id is undefined", async () => {
      await expect(
        employerService.updatePayroll(undefined, {
          status: PayrollStatus.COMPLETED,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("retryPayroll", () => {
    it("should throw ServiceException when payrollID is not provided", async () => {
      await expect(employerService.retryPayroll(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.retryPayroll(null)).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when payroll is not found", async () => {
      when(mockPayrollRepo.getPayrollByID("payroll-id")).thenResolve(undefined);

      await expect(employerService.retryPayroll("payroll-id")).rejects.toThrowError(ServiceException);
    });
    it.each([PayrollStatus.COMPLETED, PayrollStatus.EXPIRED, PayrollStatus.INVESTIGATION, PayrollStatus.IN_PROGRESS])(
      "should throw a ServiceException if payroll is in %s status",
      async status => {
        const employerID = "fake-employer";
        const { payroll } = getRandomPayroll(employerID);
        payroll.status = status;

        when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

        await expect(employerService.retryPayroll(payroll.id)).rejects.toThrowError(ServiceException);
      },
    );

    it.each([PayrollStatus.CREATED, PayrollStatus.FUNDED, PayrollStatus.INVOICED, PayrollStatus.RECEIPT])(
      "should retry payroll if payroll is in %s status",
      async status => {
        const employerID = "fake-employer";
        const { payroll } = getRandomPayroll(employerID);
        payroll.status = status;

        when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
        when(mockWorkflowExecutor.executePayrollProcessingWorkflow(payroll.id, anyString())).thenResolve();

        await employerService.retryPayroll(payroll.id);

        verify(mockWorkflowExecutor.executePayrollProcessingWorkflow(payroll.id, anyString())).once();
      },
    );
  });

  describe("createDisbursement", () => {
    it("should create disbursement", async () => {
      const employee = getRandomEmployee("fake-employer");
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", employee.id);

      when(mockEmployeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(mockPayrollDisbursementRepo.createPayrollDisbursement(anything())).thenResolve(payrollDisbursement);

      const response = await employerService.createDisbursement("fake-payroll", {
        employeeID: employee.id,
      });

      expect(response).toStrictEqual(payrollDisbursement);

      const [disbursementRequest] = capture(mockPayrollDisbursementRepo.createPayrollDisbursement).last();
      expect(disbursementRequest).toEqual({
        payrollID: "fake-payroll",
        employeeID: employee.id,
        allocationAmount: employee.allocationAmount,
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
      when(mockEmployeeService.getEmployeeByID(anything())).thenResolve(null);

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

      when(mockPayrollDisbursementRepo.getPayrollDisbursementByID(payrollDisbursement.id)).thenResolve(
        payrollDisbursement,
      );
      when(mockPayrollDisbursementRepo.updatePayrollDisbursement(anyString(), anything())).thenResolve(
        payrollDisbursement,
      );

      const response = await employerService.updateDisbursement(payrollDisbursement.payrollID, payrollDisbursement.id, {
        transactionID: "fake-transaction",
      });

      payrollDisbursement.transactionID = "fake-transaction";
      expect(response).toStrictEqual(payrollDisbursement);

      const [disbursementID, disbursementUpdateRequest] = capture(
        mockPayrollDisbursementRepo.updatePayrollDisbursement,
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
      when(mockPayrollDisbursementRepo.getPayrollDisbursementByID(anything())).thenResolve(null);

      await expect(
        employerService.updateDisbursement("fake-payroll", "fake-disbursement", {
          transactionID: "fake-transaction",
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when payroll id for disbursement is different", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(mockPayrollDisbursementRepo.getPayrollDisbursementByID(payrollDisbursement.id)).thenResolve(
        payrollDisbursement,
      );
      when(mockPayrollDisbursementRepo.updatePayrollDisbursement(anyString(), anything())).thenResolve(
        payrollDisbursement,
      );

      await expect(
        async () =>
          await employerService.updateDisbursement("fake-payroll-2", payrollDisbursement.id, {
            transactionID: "fake-transaction",
          }),
      ).rejects.toThrow(ServiceException);
    });
  });

  describe("getAllDisbursementsForPayroll", () => {
    it("should return all disbursements for payroll", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll("fake-payroll")).thenResolve([
        payrollDisbursement,
      ]);

      const response = await employerService.getAllDisbursementsForPayroll("fake-payroll");

      expect(response).toStrictEqual([payrollDisbursement]);
    });

    it("should throw 'ServiceException' when payrollID is undefined", async () => {
      await expect(employerService.getAllDisbursementsForPayroll(undefined)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getAllDisbursementsForEmployee", () => {
    it("should return all disbursements for employee", async () => {
      const { payrollDisbursement } = getRandomPayrollDisbursement("fake-payroll", "fake-employee");

      when(mockPayrollDisbursementRepo.getAllDisbursementsForEmployee("fake-employee")).thenResolve([
        payrollDisbursement,
      ]);

      const response = await employerService.getAllDisbursementsForEmployee("fake-employee");

      expect(response).toStrictEqual([payrollDisbursement]);
    });

    it("should throw 'ServiceException' when employeeID is undefined", async () => {
      await expect(employerService.getAllDisbursementsForEmployee(undefined)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerForTransactionID", () => {
    it("should return the employer associated with a transaction", async () => {
      const transactionID = "transaction-id-1";
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      const { payrollDisbursement } = getRandomPayrollDisbursement(payroll.id, "fake-employee");
      payrollDisbursement.transactionID = transactionID;

      when(mockPayrollDisbursementRepo.getPayrollDisbursementByTransactionID(transactionID)).thenResolve(
        payrollDisbursement,
      );
      when(mockPayrollRepo.getPayrollByID(payrollDisbursement.payrollID)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(payroll.employerID)).thenResolve(employer);

      const response = await employerService.getEmployerForTransactionID(transactionID);

      expect(response).toStrictEqual(employer);
    });

    it("should return null if disbursement cannot be found", async () => {
      when(mockPayrollDisbursementRepo.getPayrollDisbursementByTransactionID("1234")).thenResolve(null);
      expect(await employerService.getEmployerForTransactionID("1234")).toBeNull();
    });

    it("should return null if payroll cannot be found", async () => {
      const transactionID = "transaction-id-1";
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      const { payrollDisbursement } = getRandomPayrollDisbursement(payroll.id, "fake-employee");
      payrollDisbursement.transactionID = transactionID;

      when(mockPayrollDisbursementRepo.getPayrollDisbursementByTransactionID(transactionID)).thenResolve(
        payrollDisbursement,
      );
      when(mockPayrollRepo.getPayrollByID(payrollDisbursement.payrollID)).thenResolve(null);

      expect(await employerService.getEmployerForTransactionID(transactionID)).toBeNull();
    });
  });

  describe("createInvoice", () => {
    it("should throw SEMANTIC_VALIDATION when payrollID is undefined", async () => {
      expect(employerService.createInvoice(undefined)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should throw SEMANTIC_VALIDATION when payrollID is not found", async () => {
      when(mockPayrollRepo.getPayrollByID("fake-payroll")).thenResolve(null);

      expect(employerService.createInvoice("fake-payroll")).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should throw SEMANTIC_VALIDATION when employerID is not found", async () => {
      const { payroll } = getRandomPayroll("fake-employer");

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(payroll.employerID)).thenResolve(null);

      expect(employerService.createInvoice(payroll.id)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should throw SEMANTIC_VALIDATION when Account number fails decryption", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(employer.id)).thenResolve(employer);
      when(mockKMSService.decryptString(employer.payrollAccountNumber, anything())).thenResolve(null);

      expect(employerService.createInvoice(payroll.id)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should successfully create invoice", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(employer.id)).thenResolve(employer);
      when(mockKMSService.decryptString(employer.payrollAccountNumber, anything())).thenResolve(
        employer.payrollAccountNumber,
      );

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve([]);

      when(mockTemplateProcessor.addFormat(anything())).thenResolve();
      when(mockTemplateProcessor.addLocale(anything())).thenResolve();
      when(mockTemplateProcessor.loadTemplates()).thenResolve();

      const baseTemplateFields: InvoiceTemplateFields = {
        companyName: employer.name,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        currency: payroll.debitCurrency,
        allocations: [],
        nobaAccountNumber: employer.payrollAccountNumber,
        payrollDate: "",
        totalAmount: "",
      };

      const englishTemplateFields: InvoiceTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.ENGLISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
          minimumFractionDigits: 2,
        }),
      };

      const spanishTemplateFields: InvoiceTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.SPANISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
          minimumFractionDigits: 2,
        }),
      };

      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.ENGLISH,
          deepEqual(englishTemplateFields),
        ),
      ).thenResolve();
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.SPANISH,
          deepEqual(spanishTemplateFields),
        ),
      ).thenResolve();

      when(mockTemplateProcessor.destroy()).thenResolve();

      await employerService.createInvoice(payroll.id);
      expect(constructorSpy).toHaveBeenCalledTimes(1);
    });

    it("should successfully create invoice with disbursements", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);
      const consumer1 = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mock-consumer-2",
        firstName: "Mock",
        lastName: "Consumer2",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(employer.id)).thenResolve(employer);
      when(mockKMSService.decryptString(employer.payrollAccountNumber, anything())).thenResolve(
        employer.payrollAccountNumber,
      );

      when(mockTemplateProcessor.addFormat(TemplateProcessModule.TemplateFormat.HTML)).thenResolve();
      when(mockTemplateProcessor.addFormat(TemplateProcessModule.TemplateFormat.PDF)).thenResolve();
      when(mockTemplateProcessor.addLocale(TemplateProcessModule.TemplateLocale.ENGLISH)).thenResolve();
      when(mockTemplateProcessor.addLocale(TemplateProcessModule.TemplateLocale.SPANISH)).thenResolve();

      mockTemplateProcessorInstance.locales = new Set([
        TemplateProcessModule.TemplateLocale.ENGLISH,
        TemplateProcessModule.TemplateLocale.SPANISH,
      ]);

      when(mockTemplateProcessor.loadTemplates()).thenResolve();

      const payrollDisbursements: PayrollDisbursement[] = [
        {
          id: "fake-disbursement",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          payrollID: payroll.id,
          employeeID: employee1.id,
          transactionID: "fake-transaction",
          allocationAmount: 100,
          creditAmount: 5,
        },
        {
          id: "fake-disbursement-2",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          payrollID: payroll.id,
          employeeID: employee2.id,
          transactionID: "fake-transaction",
          allocationAmount: 100,
          creditAmount: 5,
        },
      ];

      const baseTemplateFields: InvoiceTemplateFields = {
        companyName: employer.name,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        currency: payroll.debitCurrency,
        allocations: [],
        nobaAccountNumber: employer.payrollAccountNumber,
        payrollDate: "",
        totalAmount: "",
      };

      const englishTemplateFields: InvoiceTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.ENGLISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
          minimumFractionDigits: 2,
        }),
        allocations: [
          {
            employeeName: `${consumer1.props.firstName} ${consumer1.props.lastName}`,
            amount: amountStrEnglish100,
          },
          {
            employeeName: `${consumer2.props.firstName} ${consumer2.props.lastName}`,
            amount: amountStrEnglish100,
          },
        ],
      };

      const spanishTemplateFields: InvoiceTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.SPANISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
          minimumFractionDigits: 2,
        }),
        allocations: [
          {
            employeeName: `${consumer1.props.firstName} ${consumer1.props.lastName}`,
            amount: amountStrSpanish100,
          },
          {
            employeeName: `${consumer2.props.firstName} ${consumer2.props.lastName}`,
            amount: amountStrSpanish100,
          },
        ],
      };

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve(payrollDisbursements);
      when(mockEmployeeService.getEmployeeByID(employee1.id)).thenResolve(employee1);
      when(mockEmployeeService.getEmployeeByID(employee2.id)).thenResolve(employee2);

      when(mockConsumerService.getConsumer(employee1.consumerID)).thenResolve(consumer1);
      when(mockConsumerService.getConsumer(employee2.consumerID)).thenResolve(consumer2);
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.ENGLISH,
          deepEqual(englishTemplateFields),
        ),
      ).thenResolve();
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.SPANISH,
          deepEqual(spanishTemplateFields),
        ),
      ).thenResolve();

      when(mockTemplateProcessor.destroy()).thenResolve();

      const addFormatSpy = jest.spyOn(mockTemplateProcessorInstance, "addFormat");
      const addLocaleSpy = jest.spyOn(mockTemplateProcessorInstance, "addLocale");

      await employerService.createInvoice(payroll.id);

      expect(constructorSpy).toHaveBeenCalledTimes(1);
      expect(addFormatSpy).toHaveBeenCalledWith(TemplateProcessModule.TemplateFormat.HTML);
      expect(addFormatSpy).toHaveBeenCalledWith(TemplateProcessModule.TemplateFormat.PDF);
      expect(addLocaleSpy).toHaveBeenCalledWith(
        TemplateProcessModule.TemplateLocale.ENGLISH,
        EmployerService.FOOTER_TRANSLATIONS[TemplateProcessModule.TemplateLocale.ENGLISH.toString()],
      );
      expect(addLocaleSpy).toHaveBeenCalledWith(
        TemplateProcessModule.TemplateLocale.SPANISH,
        EmployerService.FOOTER_TRANSLATIONS[TemplateProcessModule.TemplateLocale.SPANISH.toString()],
      );
    });
  });

  describe("createInvoiceReceipt", () => {
    it("should throw SEMANTIC_VALIDATION when payrollID is undefined", async () => {
      expect(employerService.createInvoiceReceipt(undefined)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should throw SEMANTIC_VALIDATION when payrollID is not found", async () => {
      when(mockPayrollRepo.getPayrollByID("fake-payroll")).thenResolve(null);

      expect(employerService.createInvoiceReceipt("fake-payroll")).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it.each([
      PayrollStatus.CREATED,
      PayrollStatus.INVOICED,
      PayrollStatus.PREPARED,
      PayrollStatus.INVESTIGATION,
      PayrollStatus.FUNDED,
      PayrollStatus.EXPIRED,
      PayrollStatus.IN_PROGRESS,
      PayrollStatus.COMPLETED,
    ])("should throw SEMANTIC_VALIDATION when payroll is found but in the wrong status (%s)", async status => {
      const { payroll } = getRandomPayroll("fake-employer");
      payroll.status = status;
      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);

      expect(employerService.createInvoiceReceipt(payroll.id)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should throw SEMANTIC_VALIDATION when employerID is not found", async () => {
      const { payroll } = getRandomPayroll("fake-employer");
      payroll.status = PayrollStatus.RECEIPT;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(payroll.employerID)).thenResolve(null);

      expect(employerService.createInvoiceReceipt(payroll.id)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });

    it("should successfully create a receipt", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      payroll.status = PayrollStatus.RECEIPT;

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(employer.id)).thenResolve(employer);

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve([]);

      when(mockTemplateProcessor.addFormat(anything())).thenResolve();
      when(mockTemplateProcessor.addLocale(anything())).thenResolve();
      when(mockTemplateProcessor.loadTemplates()).thenResolve();

      const baseTemplateFields: InvoiceReceiptTemplateFields = {
        companyName: employer.name,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        currency: payroll.debitCurrency,
        allocations: [],
        payrollDate: "",
        totalAmount: "",
        totalCreditAmount: "",
      };

      const englishTemplateFields: InvoiceReceiptTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.ENGLISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
          minimumFractionDigits: 2,
        }),
        totalCreditAmount: payroll.totalCreditAmount.toLocaleString(
          TemplateProcessModule.TemplateLocale.ENGLISH.toString(),
          { minimumFractionDigits: 2 },
        ),
      };

      const spanishTemplateFields: InvoiceReceiptTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.SPANISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
          minimumFractionDigits: 2,
        }),
        totalCreditAmount: payroll.totalCreditAmount.toLocaleString(
          TemplateProcessModule.TemplateLocale.SPANISH.toString(),
          { minimumFractionDigits: 2 },
        ),
      };

      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.ENGLISH,
          deepEqual(englishTemplateFields),
        ),
      ).thenResolve();
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.SPANISH,
          deepEqual(spanishTemplateFields),
        ),
      ).thenResolve();

      when(mockTemplateProcessor.destroy()).thenResolve();

      await employerService.createInvoiceReceipt(payroll.id);
      expect(constructorSpy).toHaveBeenCalledTimes(1);
    });

    it("should successfully create receipt with disbursements", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      payroll.status = PayrollStatus.RECEIPT;

      const employee1 = getRandomEmployee(employer.id);
      const employee2 = getRandomEmployee(employer.id);
      const consumer1 = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mock-consumer-2",
        firstName: "Mock",
        lastName: "Consumer2",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      when(mockPayrollRepo.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(mockEmployerRepo.getEmployerByID(employer.id)).thenResolve(employer);

      when(mockTemplateProcessor.addFormat(TemplateProcessModule.TemplateFormat.HTML)).thenResolve();
      when(mockTemplateProcessor.addFormat(TemplateProcessModule.TemplateFormat.PDF)).thenResolve();
      when(mockTemplateProcessor.addLocale(TemplateProcessModule.TemplateLocale.ENGLISH)).thenResolve();
      when(mockTemplateProcessor.addLocale(TemplateProcessModule.TemplateLocale.SPANISH)).thenResolve();

      mockTemplateProcessorInstance.locales = new Set([
        TemplateProcessModule.TemplateLocale.ENGLISH,
        TemplateProcessModule.TemplateLocale.SPANISH,
      ]);

      when(mockTemplateProcessor.loadTemplates()).thenResolve();

      const payrollDisbursements: PayrollDisbursement[] = [
        {
          id: "fake-disbursement",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          payrollID: payroll.id,
          employeeID: employee1.id,
          transactionID: "fake-transaction",
          allocationAmount: 100,
          creditAmount: 65.5392,
        },
        {
          id: "fake-disbursement-2",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          payrollID: payroll.id,
          employeeID: employee2.id,
          transactionID: "fake-transaction",
          allocationAmount: 100,
          creditAmount: 65.5392,
        },
      ];

      const totalCreditAmount =
        Utils.roundToSpecifiedDecimalNumber(65.5392, 2) + Utils.roundToSpecifiedDecimalNumber(65.5392, 2);
      const baseTemplateFields: InvoiceReceiptTemplateFields = {
        companyName: employer.name,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        currency: payroll.debitCurrency,
        allocations: [],
        payrollDate: "",
        totalAmount: "",
        totalCreditAmount: "",
      };

      const englishTemplateFields: InvoiceReceiptTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.ENGLISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
          minimumFractionDigits: 2,
        }),
        totalCreditAmount: totalCreditAmount.toLocaleString(TemplateProcessModule.TemplateLocale.ENGLISH.toString(), {
          minimumFractionDigits: 2,
        }),
        allocations: [
          {
            employeeName: `${consumer1.props.firstName} ${consumer1.props.lastName}`,
            amount: amountStrEnglish100,
            creditAmount: creditAmountStrEnglishDecimal,
          },
          {
            employeeName: `${consumer2.props.firstName} ${consumer2.props.lastName}`,
            amount: amountStrEnglish100,
            creditAmount: creditAmountStrEnglishDecimal,
          },
        ],
      };

      const spanishTemplateFields: InvoiceReceiptTemplateFields = {
        ...baseTemplateFields,
        payrollDate: dayjs(payroll.payrollDate)
          .locale(TemplateProcessModule.TemplateLocale.SPANISH.toString())
          .format("MMMM D, YYYY"),
        totalAmount: payroll.totalDebitAmount.toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
          minimumFractionDigits: 2,
        }),
        totalCreditAmount: totalCreditAmount.toLocaleString(TemplateProcessModule.TemplateLocale.SPANISH.toString(), {
          minimumFractionDigits: 2,
        }),
        allocations: [
          {
            employeeName: `${consumer1.props.firstName} ${consumer1.props.lastName}`,
            amount: amountStrSpanish100,
            creditAmount: creditAmountStrSpanishDecimal,
          },
          {
            employeeName: `${consumer2.props.firstName} ${consumer2.props.lastName}`,
            amount: amountStrSpanish100,
            creditAmount: creditAmountStrSpanishDecimal,
          },
        ],
      };

      when(mockPayrollDisbursementRepo.getAllDisbursementsForPayroll(payroll.id)).thenResolve(payrollDisbursements);
      when(mockEmployeeService.getEmployeeByID(employee1.id)).thenResolve(employee1);
      when(mockEmployeeService.getEmployeeByID(employee2.id)).thenResolve(employee2);

      when(mockConsumerService.getConsumer(employee1.consumerID)).thenResolve(consumer1);
      when(mockConsumerService.getConsumer(employee2.consumerID)).thenResolve(consumer2);
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.ENGLISH,
          deepEqual(englishTemplateFields),
        ),
      ).thenResolve();
      when(
        mockTemplateProcessor.populateTemplate(
          TemplateProcessModule.TemplateLocale.SPANISH,
          deepEqual(spanishTemplateFields),
        ),
      ).thenResolve();

      when(mockTemplateProcessor.destroy()).thenResolve();

      const addFormatSpy = jest.spyOn(mockTemplateProcessorInstance, "addFormat");
      const addLocaleSpy = jest.spyOn(mockTemplateProcessorInstance, "addLocale");

      await employerService.createInvoiceReceipt(payroll.id);

      expect(constructorSpy).toHaveBeenCalledTimes(1);
      expect(addFormatSpy).toHaveBeenCalledWith(TemplateProcessModule.TemplateFormat.HTML);
      expect(addFormatSpy).toHaveBeenCalledWith(TemplateProcessModule.TemplateFormat.PDF);
      expect(addLocaleSpy).toHaveBeenCalledWith(
        TemplateProcessModule.TemplateLocale.ENGLISH,
        EmployerService.FOOTER_TRANSLATIONS[TemplateProcessModule.TemplateLocale.ENGLISH.toString()],
      );
      expect(addLocaleSpy).toHaveBeenCalledWith(
        TemplateProcessModule.TemplateLocale.SPANISH,
        EmployerService.FOOTER_TRANSLATIONS[TemplateProcessModule.TemplateLocale.SPANISH.toString()],
      );
    });
  });
});
