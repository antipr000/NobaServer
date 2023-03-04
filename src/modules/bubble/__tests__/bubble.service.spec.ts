import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyNumber, anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { uuid } from "uuidv4";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency } from "../../../modules/employee/domain/Employee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { BubbleService } from "../bubble.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { getRandomPayroll } from "../../../modules/employer/test_utils/payroll.test.utils";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
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
  let notificationService: NotificationService;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();

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
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        BubbleService,
      ],
    }).compile();

    bubbleService = app.get<BubbleService>(BubbleService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createEmployeeInBubble", () => {
    it("should create an employee in a bubble", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
      when(notificationService.sendNotification(anything(), anything())).thenResolve();

      await bubbleService.createEmployeeInBubble(employee.id, consumer);

      const [notificationEventType, notificationArgs] = capture(notificationService.sendNotification).last();
      expect(notificationEventType).toBe(NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT);
      expect(notificationArgs).toEqual({
        email: consumer.props.email,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        phone: consumer.props.phone,
        employerReferralID: employer.referralID,
        nobaEmployeeID: employee.id,
        allocationAmountInPesos: employee.allocationAmount,
      });
    });

    it("should throw ServiceException if the 'allocationCurrency' is not 'COP'", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);
      employee.allocationCurrency = "USD" as EmployeeAllocationCurrency;

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);

      try {
        await bubbleService.createEmployeeInBubble(employee.id, consumer);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("COP"));
        expect(err.message).toEqual(expect.stringContaining("'allocationCurrency'"));
      }
    });
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

  describe("updateEmployeeAllocationInBubble", () => {
    it("should forwards the request to BubbleClient as is", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer);
      const newAllocationAmount = 12345;

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(notificationService.sendNotification(anything(), anything())).thenResolve();

      await bubbleService.updateEmployeeAllocationInBubble(employee.id, newAllocationAmount);

      const [eventType, eventArgs] = capture(notificationService.sendNotification).last();
      expect(eventType).toEqual(NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT);
      expect(eventArgs).toEqual({
        nobaEmployeeID: employee.id,
        allocationAmountInPesos: newAllocationAmount,
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

      when(notificationService.sendNotification(anything(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, {
        maxAllocationPercent: updatedMaxAllocationPercent,
      });

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
          deepEqual({
            nobaEmployeeID: updatedEmployee1.id,
            allocationAmountInPesos: updatedEmployee1.allocationAmount,
          }),
        ),
      ).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
          deepEqual({
            nobaEmployeeID: updatedEmployee3.id,
            allocationAmountInPesos: updatedEmployee3.allocationAmount,
          }),
        ),
      ).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
          deepEqual({
            nobaEmployeeID: employee2.id,
            allocationAmountInPesos: employee2.allocationAmount,
          }),
        ),
      ).never();
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
    it("should update employee", async () => {
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

      when(notificationService.sendNotification(anything(), anything())).thenResolve();

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

      const [eventType, eventArgs] = capture(notificationService.sendNotification).last();
      expect(eventType).toEqual(NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT);
      expect(eventArgs).toEqual({
        nobaEmployeeID: employee.id,
        allocationAmountInPesos: updatedEmployee.allocationAmount,
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
});
