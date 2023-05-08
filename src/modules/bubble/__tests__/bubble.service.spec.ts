import { Test, TestingModule } from "@nestjs/testing";
import {
  GENERATED_DATA_BUCKET_NAME,
  INVITE_CSV_FOLDER_BUCKET_PATH,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyNumber, anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { uuid } from "uuidv4";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency, EmployeeStatus } from "../../../modules/employee/domain/Employee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { BubbleService } from "../bubble.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import {
  getRandomPayroll,
  getRandomPayrollDisbursement,
} from "../../../modules/employer/test_utils/payroll.test.utils";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";
import { S3Service } from "../../../modules/common/s3.service";
import { getMockS3ServiceWithDefaults } from "../../../modules/common/mocks/mock.s3.service";
import { CsvService } from "../../../modules/common/csv.service";
import { getMockCsvServiceWithDefaults } from "../../../modules/common/mocks/mock.csv.service";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    locale: "en_us",
    referralID: uuid(),
    leadDays: 1,
    payrollAccountNumber: "123456789",
    payrollDates: ["2020-03-01"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

const getRandomEmployee = (consumerID: string, employer: Employer): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: employer.id,
    consumerID: consumerID,
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    employer: employer,
    status: EmployeeStatus.LINKED,
  };

  return employee;
};

const getRandomConsumer = (): Consumer => {
  const consumer = Consumer.createConsumer({
    id: uuid(),
    email: `${uuid()}@noba.com`,
  });
  return consumer;
};

describe("BubbleServiceTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let employerService: EmployerService;
  let employeeService: EmployeeService;
  let bubbleService: BubbleService;
  let workflowExecutor: WorkflowExecutor;
  let s3Service: S3Service;
  let csvService: CsvService;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    workflowExecutor = getMockWorkflowExecutorWithDefaults();
    s3Service = getMockS3ServiceWithDefaults();
    csvService = getMockCsvServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [GENERATED_DATA_BUCKET_NAME]: "fake-bucket",
      [INVITE_CSV_FOLDER_BUCKET_PATH]: "fake-path",
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        {
          provide: S3Service,
          useFactory: () => instance(s3Service),
        },
        {
          provide: CsvService,
          useFactory: () => instance(csvService),
        },
        BubbleService,
      ],
    }).compile();

    bubbleService = app.get<BubbleService>(BubbleService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("registerEmployerInNoba", () => {
    it("should register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollAccountNumber: employer.payrollAccountNumber,
        payrollDates: employer.payrollDates,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollAccountNumber: employer.payrollAccountNumber,
        payrollDates: employer.payrollDates,
      });
    });

    it("should register an employer with specified maxAllocationPercent in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      employer.maxAllocationPercent = 0.5;

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        payrollAccountNumber: employer.payrollAccountNumber,
        maxAllocationPercent: employer.maxAllocationPercent,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        payrollAccountNumber: employer.payrollAccountNumber,
        maxAllocationPercent: employer.maxAllocationPercent,
      });
    });

    it("shouldn't forward 'leadDays' if not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
        payrollDates: employer.payrollDates,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
        payrollDates: employer.payrollDates,
      });
    });

    it("shouldn't forward 'payrollDays' if not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
        leadDays: employer.leadDays,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
        leadDays: employer.leadDays,
      });
    });

    it("shouldn't forward both 'leadDays' & 'payrollDays' if they are not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollAccountNumber: employer.payrollAccountNumber,
      });
    });
  });

  describe("updateEmployerInNoba", () => {
    it("should update the 'leadDays' and 'maxAllocationPercent' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedLeadDays = 10;
      const updatedMaxAllocationPercent = 10;

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();
      when(employeeService.updateAllocationAmountsForNewMaxAllocationPercent(anyString(), anyNumber())).thenResolve([]);

      await bubbleService.updateEmployerInNoba(employer.referralID, {
        leadDays: updatedLeadDays,
        maxAllocationPercent: updatedMaxAllocationPercent,
      });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({
        leadDays: updatedLeadDays,
        maxAllocationPercent: updatedMaxAllocationPercent,
      });

      const [propagatedEmployerIDToEmployeeService, propagatedMaxAllocationPercentToEmployeeService] = capture(
        employeeService.updateAllocationAmountsForNewMaxAllocationPercent,
      ).last();

      expect(propagatedEmployerIDToEmployeeService).toEqual(employer.id);
      expect(propagatedMaxAllocationPercentToEmployeeService).toEqual(updatedMaxAllocationPercent);
    });

    it("should update Bubble if any employee salaries were reduced as a result of employer allocation reduction", async () => {
      const consumer1: Consumer = getRandomConsumer();
      const consumer2: Consumer = getRandomConsumer();
      const consumer3: Consumer = getRandomConsumer();
      const employer: Employer = getRandomEmployer();
      employer.maxAllocationPercent = 50;
      const employee1: Employee = getRandomEmployee(consumer1.props.id, employer);
      employee1.salary = 100000;
      employee1.allocationAmount = 50000; // Right on the current limit, should be reduced for new percent
      const employee2: Employee = getRandomEmployee(consumer2.props.id, employer);
      employee2.salary = 200000;
      employee2.allocationAmount = 50000; // Below the current limit, should not be reduced
      const employee3: Employee = getRandomEmployee(consumer3.props.id, employer);
      employee3.salary = 300000;
      employee3.allocationAmount = 160000; // Above the current limit, should be reduced

      const updatedMaxAllocationPercent = 10;

      const updatedEmployee1: Employee = {
        ...employee1,
        allocationAmount: 10000,
      };

      const updatedEmployee3: Employee = {
        ...employee3,
        allocationAmount: 30000,
      };

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();
      when(employeeService.updateAllocationAmountsForNewMaxAllocationPercent(anyString(), anyNumber())).thenResolve([
        updatedEmployee1,
        updatedEmployee3,
      ]);

      await bubbleService.updateEmployerInNoba(employer.referralID, {
        maxAllocationPercent: updatedMaxAllocationPercent,
      });
    });

    it("should update the 'payrollDays' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedPayrollDates = ["2020-03-17", "2020-03-19"];

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, { payrollDates: updatedPayrollDates });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ payrollDates: updatedPayrollDates });
    });

    it("should update the 'logoURI' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedLogoURI = "new-logo-uri";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, { logoURI: updatedLogoURI });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ logoURI: updatedLogoURI });
    });

    it("should update the 'payrollAccountNumber' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedPayrollAccountNumber = "new-account-number";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, {
        payrollAccountNumber: updatedPayrollAccountNumber,
      });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ payrollAccountNumber: updatedPayrollAccountNumber });
    });

    it("should throw error if 'referralID' is not linked with an existing Employer", async () => {
      const invalidReferralID = "invalid-referral-id";
      when(employerService.getEmployerByReferralID(invalidReferralID)).thenResolve(null);

      try {
        await bubbleService.updateEmployerInNoba(invalidReferralID, { logoURI: "updatedLogoURI" });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
        expect(err.message).toEqual(expect.stringContaining("No employer found"));
      }
    });
  });

  describe("updateEmployee", () => {
    it("should update employee salary", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(employeeService.updateEmployee(anyString(), anything())).thenResolve(employee);

      await bubbleService.updateEmployee(employee.id, {
        salary: 1000,
      });

      const [propagatedEmployeeIDToEmployeeService, propagatedEmployeePropsToEmployeeService] = capture(
        employeeService.updateEmployee,
      ).last();

      expect(propagatedEmployeeIDToEmployeeService).toEqual(employee.id);
      expect(propagatedEmployeePropsToEmployeeService).toEqual({
        salary: 1000,
      });
    });

    it("should update employee status", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(employeeService.updateEmployee(anyString(), anything())).thenResolve(employee);

      await bubbleService.updateEmployee(employee.id, {
        status: EmployeeStatus.UNLINKED,
      });

      const [propagatedEmployeeIDToEmployeeService, propagatedEmployeePropsToEmployeeService] = capture(
        employeeService.updateEmployee,
      ).last();

      expect(propagatedEmployeeIDToEmployeeService).toEqual(employee.id);
      expect(propagatedEmployeePropsToEmployeeService).toEqual({
        status: EmployeeStatus.UNLINKED,
      });
    });

    it("should update Bubble if employee salary caused a reducation in allocation amount", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 50;
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);
      employee.salary = 100000;
      employee.allocationAmount = 50000;

      const newSalary = 50000;

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);

      const updatedEmployee: Employee = {
        ...employee,
        allocationAmount: (newSalary * employer.maxAllocationPercent) / 100,
      };

      when(employeeService.updateEmployee(anyString(), anything())).thenResolve(updatedEmployee);

      await bubbleService.updateEmployee(employee.id, {
        salary: newSalary, // Should cause max allocation for employee to be 25000
      });

      const [propagatedEmployeeIDToEmployeeService, propagatedEmployeePropsToEmployeeService] = capture(
        employeeService.updateEmployee,
      ).last();

      expect(propagatedEmployeeIDToEmployeeService).toEqual(employee.id);
      expect(propagatedEmployeePropsToEmployeeService).toEqual({
        salary: newSalary,
      });
    });

    it("should throw 'ServiceException' when employee with given ID is not found", async () => {
      const employeeID = "invalid-employee-id";
      when(employeeService.getEmployeeByID(employeeID)).thenResolve(null);

      try {
        await bubbleService.updateEmployee(employeeID, {
          salary: 1000,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
        expect(err.message).toEqual(expect.stringContaining("No employee found"));
      }
    });
  });

  describe("createPayroll", () => {
    it("should create payroll and return it", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      const payrollDate = "2020-03-17";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.createPayroll(employer.id, payrollDate)).thenResolve(payroll);
      when(workflowExecutor.executePayrollProcessingWorkflow(payroll.id, payroll.id)).thenResolve(null);

      const response = await bubbleService.createPayroll(employer.referralID, payrollDate);
      expect(response).toStrictEqual(payroll);
    });

    it("should throw ServiceException when employer with referralID does not exist", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);
      const payrollDate = "2020-03-17";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(null);
      when(employerService.createPayroll(employer.id, payrollDate)).thenResolve(payroll);

      await expect(async () => await bubbleService.createPayroll(employer.referralID, payrollDate)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getAllPayrollsForEmployer", () => {
    it("should return all payrolls for employer", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getAllPayrollsForEmployer(employer.id)).thenResolve([payroll]);

      const response = await bubbleService.getAllPayrollsForEmployer(employer.referralID);
      expect(response).toStrictEqual([payroll]);
    });

    it("should throw ServiceException when employer with referralID does not exist", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(null);
      when(employerService.getAllPayrollsForEmployer(employer.id)).thenResolve([payroll]);

      expect(bubbleService.getAllPayrollsForEmployer(employer.referralID)).rejects.toThrow(ServiceException);
    });
  });

  describe("getPayrollWithDisbursements", () => {
    it("should return payroll with disbursements", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll(employer.id);

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      const response = await bubbleService.getPayroll(employer.referralID, payroll.id);
      expect(response).toStrictEqual({
        ...payroll,
      });
    });

    it("should throw ServiceException when employer with referralID does not exist", async () => {
      expect(bubbleService.getPayroll(undefined, "fake-payroll-id")).rejects.toThrow(ServiceException);
    });

    it("should throw error when payroll does not belong to employer", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll("fake-employer-id");

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      expect(bubbleService.getPayroll(employer.referralID, payroll.id)).rejects.toThrow(ServiceException);
    });
  });

  describe("getAllDisbursementsForEmployee", () => {
    it("should return all disbursements for employee", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee("fake-consumer-id", employer);
      const { payroll } = getRandomPayroll(employer.id);
      const { payrollDisbursement } = getRandomPayrollDisbursement(payroll.id, employee.id);

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(employerService.getAllDisbursementsForEmployee(employee.id)).thenResolve([payrollDisbursement]);

      const response = await bubbleService.getAllDisbursementsForEmployee(employer.referralID, employee.id);
      expect(response).toStrictEqual([payrollDisbursement]);
    });

    it("should throw ServiceException if employer doesn't exist", async () => {
      when(employerService.getEmployerByReferralID(anything())).thenResolve(null);

      expect(bubbleService.getAllDisbursementsForEmployee("1234", "456")).rejects.toThrowServiceException(
        ServiceErrorCode.DOES_NOT_EXIST,
      );
    });

    it("should throw ServiceException when employee does not belong to employer", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee("fake-consumer-id", employer);
      employee.employerID = "fake-employer-id";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);

      expect(
        bubbleService.getAllDisbursementsForEmployee(employer.referralID, employee.id),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
    });
  });

  describe("getAllEmployeesForEmployer", () => {
    it("should throw 'ServiceException' when referralID is undefined", async () => {
      await expect(async () => await bubbleService.getAllEmployeesForEmployer(undefined, {})).rejects.toThrow(
        ServiceException,
      );
    });

    it("should return paginated list of employees", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee("fake-consumer-id", employer);

      when(employerService.getFilteredEmployeesForEmployer(employer.referralID, deepEqual({}))).thenResolve({
        items: [employee],
        page: 1,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
      });

      const response = await bubbleService.getAllEmployeesForEmployer(employer.referralID, {});
      expect(response).toStrictEqual({
        items: [employee],
        page: 1,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
      });
    });
  });

  describe("createEmployeeForEmployer", () => {
    it("should throw ServiceException if referralID is missing", async () => {
      await expect(async () => await bubbleService.createEmployeeForEmployer(undefined, {} as any)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if employer with referralID does not exist", async () => {
      when(employerService.getEmployerByReferralID(anything())).thenResolve(null);

      await expect(
        async () => await bubbleService.createEmployeeForEmployer("fake-referral-id", {} as any),
      ).rejects.toThrow(ServiceException);
    });

    it("should throw ServiceException when email is missing", async () => {
      const employer = getRandomEmployer();

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      await expect(
        async () =>
          await bubbleService.createEmployeeForEmployer(employer.referralID, {
            email: undefined,
            sendEmail: false,
          }),
      ).rejects.toThrow(ServiceException);
    });

    it("should call employeeService.inviteEmployee", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee(null, employer);
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employeeService.inviteEmployee(anyString(), anything(), anything())).thenResolve(employee);

      const response = await bubbleService.createEmployeeForEmployer(employer.referralID, {
        email: "fake-email@noba.com",
        sendEmail: true,
      });

      expect(response).toStrictEqual(employee);

      verify(employeeService.inviteEmployee("fake-email@noba.com", deepEqual(employer), true)).once();
    });
  });

  describe("getAllEnrichedDisbursementsForPayroll", () => {
    it("should return all enriched disbursements for payroll", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee("fake-consumer-id", employer);
      const { payroll } = getRandomPayroll(employer.id);

      const enrichedDisbursement = {
        id: "fake-id",
        debitAmount: 1000,
        creditAmount: 1000,
        status: TransactionStatus.COMPLETED,
        firstName: "Fake",
        lastName: "Fake",
        updatedTimestamp: new Date(),
      };

      const paginatedEnrichedDisbursements = {
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
        items: [enrichedDisbursement],
      };

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getFilteredEnrichedDisbursementsForPayroll(payroll.id, null)).thenResolve(
        paginatedEnrichedDisbursements,
      );
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      const response = await bubbleService.getAllEnrichedDisbursementsForPayroll(employer.referralID, payroll.id, null);
      expect(response).toStrictEqual(paginatedEnrichedDisbursements);
    });

    it("should throw ServiceException if employer doesn't exist", async () => {
      when(employerService.getEmployerByReferralID(anything())).thenResolve(null);

      expect(bubbleService.getAllEnrichedDisbursementsForPayroll("1234", "456", null)).rejects.toThrowServiceException(
        ServiceErrorCode.DOES_NOT_EXIST,
      );
    });

    it("should throw ServiceException if payroll doesn't exist", async () => {
      const employer = getRandomEmployer();
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getPayrollByID(anything())).thenResolve(null);

      expect(
        bubbleService.getAllEnrichedDisbursementsForPayroll(employer.referralID, "456", null),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
    });

    it("should throw ServiceException when payroll does not belong to employer", async () => {
      const employer = getRandomEmployer();
      const { payroll } = getRandomPayroll("fake-employer-id");

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);

      expect(
        bubbleService.getAllEnrichedDisbursementsForPayroll(employer.referralID, payroll.id, null),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
    });
  });

  describe("bulkInviteEmployeesForEmployer", () => {
    it("should throw ServiceException if referralID is missing", async () => {
      expect(
        async () => await bubbleService.bulkInviteEmployeesForEmployer(undefined, {} as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException if employer with referralID does not exist", async () => {
      when(employerService.getEmployerByReferralID(anything())).thenResolve(null);

      expect(
        async () => await bubbleService.bulkInviteEmployeesForEmployer("fake-referral-id", {} as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
    });

    it("should throw ServiceException when CSV format is not valid", async () => {
      const employer = getRandomEmployer();
      const csvHeaders = ["Email", "FirstName", "LastName", "Salary"];

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);

      expect(
        async () =>
          await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, {
            buffer: Buffer.from("fake-csv"),
          } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException when CSV headers do not match employer locale", async () => {
      const employer = getRandomEmployer();
      const csvHeaders = ["Email", "First Name", "Last Name", "Salary"];
      employer.locale = "es_co";
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);

      expect(
        async () =>
          await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, {
            buffer: Buffer.from("fake-csv"),
          } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException when CSV contains invalid email", async () => {
      const employer = getRandomEmployer();
      const csvHeaders = ["Email", "First Name", "Last Name", "Salary"];
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);
      when(csvService.getAllRowsForSpecificColumn(anything(), 0)).thenResolve(["fake-email", "fake-email-2@noba.com"]);
      expect(
        async () =>
          await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, {
            buffer: Buffer.from("fake-csv"),
          } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException when salary is not integer", async () => {
      const employer = getRandomEmployer();
      const csvHeaders = ["Email", "First Name", "Last Name", "Salary"];
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);
      when(csvService.getAllRowsForSpecificColumn(anything(), 0)).thenResolve([
        "fake-email@noba.com",
        "fake-email-2@noba.com",
      ]);
      when(csvService.getAllRowsForSpecificColumn(anything(), 3)).thenResolve(["2500", "5231.23"]);

      expect(
        async () =>
          await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, {
            buffer: Buffer.from("fake-csv"),
          } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should dispatch workflow event to invite employees", async () => {
      const employer = getRandomEmployer();
      const csvHeaders = ["Email", "First Name", "Last Name", "Salary"];
      const file: Express.Multer.File = {
        buffer: Buffer.from("fake-csv"),
      } as any;

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);
      when(csvService.getAllRowsForSpecificColumn(anything(), 0)).thenResolve([
        "fake-email@noba.com",
        "fake-email-2@noba.com",
      ]);
      when(csvService.getAllRowsForSpecificColumn(anything(), 3)).thenResolve(["2500", "5231"]);
      when(s3Service.uploadToS3(anyString(), anyString(), anything())).thenResolve("fake-s3-url");
      when(
        workflowExecutor.executeBulkInviteEmployeesWorkflow(anyString(), anyString(), anyString(), anyString()),
      ).thenResolve();

      await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, file);

      verify(s3Service.uploadToS3("fake-path", `${employer.id}.csv`, deepEqual(file.buffer))).once();
      verify(
        workflowExecutor.executeBulkInviteEmployeesWorkflow(
          employer.id,
          "fake-bucket",
          `fake-path/${employer.id}.csv`,
          employer.id,
        ),
      ).once();
    });

    it("should dispatch workflow event to invite employees when locale is es", async () => {
      const employer = getRandomEmployer();
      employer.locale = "es";
      const csvHeaders = ["Correo electrónico", "Nombre", "Apellido", "Salario"];
      const file: Express.Multer.File = {
        buffer: Buffer.from("fake-csv"),
      } as any;

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(csvService.getHeadersFromCsvFile(anything())).thenResolve(csvHeaders);
      when(csvService.getAllRowsForSpecificColumn(anything(), 0)).thenResolve([
        "fake-email@noba.com",
        "fake-email-2@noba.com",
      ]);
      when(csvService.getAllRowsForSpecificColumn(anything(), 3)).thenResolve(["2500", "5231"]);
      when(s3Service.uploadToS3(anyString(), anyString(), anything())).thenResolve("fake-s3-url");
      when(
        workflowExecutor.executeBulkInviteEmployeesWorkflow(anyString(), anyString(), anyString(), anyString()),
      ).thenResolve();

      await bubbleService.bulkInviteEmployeesForEmployer(employer.referralID, file);

      verify(s3Service.uploadToS3("fake-path", `${employer.id}.csv`, deepEqual(file.buffer))).once();
      verify(
        workflowExecutor.executeBulkInviteEmployeesWorkflow(
          employer.id,
          "fake-bucket",
          `fake-path/${employer.id}.csv`,
          employer.id,
        ),
      ).once();
    });
  });
});
