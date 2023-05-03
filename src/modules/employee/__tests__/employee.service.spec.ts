import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Employee, EmployeeAllocationCurrency, EmployeeStatus } from "../domain/Employee";
import { IEmployeeRepo } from "../repo/employee.repo";
import { getMockEmployeeRepoWithDefaults } from "../mocks/mock.employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "../repo/employee.repo.module";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { EmployeeService } from "../employee.service";
import { uuid } from "uuidv4";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { createTestEmployer } from "../../../modules/employer/test_utils/test.utils";
import { EmployeeFilterOptionsDTO } from "../dto/employee.filter.options.dto";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { getRandomEmployer } from "../../../modules/employer/test_utils/employer.test.utils";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";

const getRandomEmployee = (includeEmployer?: boolean): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: uuid(),
    consumerID: uuid(),
    email: "rosie@noba.com",
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    status: EmployeeStatus.LINKED,
    ...(includeEmployer && { employer: createTestEmployer() }),
  };

  return employee;
};

const getRandomEmployeeWithoutConsumer = (includeEmployer?: boolean): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: uuid(),
    allocationAmount: 0,
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    status: EmployeeStatus.INVITED,
    ...(includeEmployer && { employer: createTestEmployer() }),
  };

  return employee;
};

describe("EmployeeServiceTests", () => {
  jest.setTimeout(20000);

  let employeeRepo: IEmployeeRepo;
  let app: TestingModule;
  let mockNotificationService: NotificationService;
  let employeeService: EmployeeService;

  beforeEach(async () => {
    employeeRepo = getMockEmployeeRepoWithDefaults();
    mockNotificationService = getMockNotificationServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EMPLOYEE_REPO_PROVIDER,
          useFactory: () => instance(employeeRepo),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(mockNotificationService),
        },
        EmployeeService,
      ],
    }).compile();

    employeeService = app.get<EmployeeService>(EmployeeService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createEmployee", () => {
    it("should create an employee and 'always' set 'COP' as the allocationCurrency", async () => {
      const employee = getRandomEmployee();
      when(employeeRepo.createEmployee(anything())).thenResolve(employee);
      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(null);

      const createdEmployee = await employeeService.createEmployee({
        allocationAmount: employee.allocationAmount,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
      });

      expect(createdEmployee).toEqual(employee);

      const [propagatedEmployeeCreateRequest] = capture(employeeRepo.createEmployee).last();
      expect(propagatedEmployeeCreateRequest).toEqual({
        allocationAmount: employee.allocationAmount,
        allocationCurrency: EmployeeAllocationCurrency.COP,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
        status: EmployeeStatus.LINKED,
      });
    });

    it("should create an employee without linking to consumer", async () => {
      const employee = getRandomEmployeeWithoutConsumer();
      when(employeeRepo.createEmployee(anything())).thenResolve(employee);
      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(null);

      const createdEmployee = await employeeService.createEmployee({
        allocationAmount: employee.allocationAmount,
        employerID: employee.employerID,
      });

      expect(createdEmployee).toEqual(employee);

      const [propagatedEmployeeCreateRequest] = capture(employeeRepo.createEmployee).last();
      expect(propagatedEmployeeCreateRequest).toEqual({
        allocationAmount: employee.allocationAmount,
        allocationCurrency: EmployeeAllocationCurrency.COP,
        employerID: employee.employerID,
        status: EmployeeStatus.CREATED,
      });
    });

    it("should return active employee if it already exists", async () => {
      const employee = getRandomEmployeeWithoutConsumer();
      employee.email = "fake+employee@noba.com";
      when(employeeRepo.createEmployee(anything())).thenResolve(employee);
      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(employee);

      const createdEmployee = await employeeService.createEmployee({
        email: employee.email,
        allocationAmount: employee.allocationAmount,
        employerID: employee.employerID,
      });

      expect(createdEmployee).toEqual(employee);

      verify(employeeRepo.createEmployee(anything())).never();
    });
  });

  describe("linkEmployee", () => {
    it("should link an unlinked employee to a consumer", async () => {
      const employee = getRandomEmployeeWithoutConsumer(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve({
        ...employee,
        status: EmployeeStatus.LINKED,
      });

      const consumerID = uuid();
      const updatedEmployee = await employeeService.linkEmployee(employee.id, consumerID);

      expect(updatedEmployee).toEqual({ ...employee, status: EmployeeStatus.LINKED });

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: 0,
        consumerID: consumerID,
        status: EmployeeStatus.LINKED,
      });
    });
  });

  describe("inviteEmployee", () => {
    it("should create new employee and send invite if opted for", async () => {
      const employer = getRandomEmployer("Fake Employer");
      employer.locale = "es";
      const employee = getRandomEmployeeWithoutConsumer(false);
      employee.employer = employer;
      const email = "fake+email@employer.com";
      employee.email = email;
      employee.status = EmployeeStatus.CREATED;

      when(employeeRepo.createEmployee(anything())).thenResolve(employee);
      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(null);
      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(mockNotificationService.sendNotification(anyString(), anything())).thenResolve();
      when(employeeRepo.updateEmployee(anyString(), anything())).thenResolve({
        ...employee,
        status: EmployeeStatus.INVITED,
        lastInviteSentTimestamp: new Date("2020-01-01"),
      });

      const response = await employeeService.inviteEmployee(email, employer, true);

      expect(response).toStrictEqual({
        ...employee,
        status: EmployeeStatus.INVITED,
        lastInviteSentTimestamp: new Date("2020-01-01"),
      });

      verify(
        employeeRepo.createEmployee(
          deepEqual({
            allocationAmount: 0,
            allocationCurrency: EmployeeAllocationCurrency.COP,
            employerID: employer.id,
            status: EmployeeStatus.CREATED,
            email: email,
          }),
        ),
      ).once();

      verify(
        mockNotificationService.sendNotification(
          NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT,
          deepEqual({
            email,
            locale: "es",
            companyName: employer.name,
            employeeID: employee.id,
            inviteUrl: `https://app.noba.com/app-routing/LoadingScreen/na/na/na/na/na/na/${employee.id}`,
          }),
        ),
      ).once();

      verify(
        employeeRepo.updateEmployee(
          employee.id,
          deepEqual({
            status: EmployeeStatus.INVITED,
            lastInviteSentTimestamp: anything(),
            allocationAmount: 0,
          }),
        ),
      ).once();
    });

    it("should create employee but not send invite if not opted for", async () => {
      const employer = getRandomEmployer("Fake Employer");
      employer.locale = "es";
      const employee = getRandomEmployeeWithoutConsumer(false);
      employee.employer = employer;
      const email = "fake+email@employer.com";
      employee.email = email;
      employee.status = EmployeeStatus.CREATED;

      when(employeeRepo.createEmployee(anything())).thenResolve(employee);
      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(null);
      const response = await employeeService.inviteEmployee(email, employer, false);

      expect(response).toStrictEqual({
        ...employee,
        status: EmployeeStatus.CREATED,
      });

      verify(
        employeeRepo.createEmployee(
          deepEqual({
            allocationAmount: 0,
            allocationCurrency: EmployeeAllocationCurrency.COP,
            employerID: employer.id,
            status: EmployeeStatus.CREATED,
            email: email,
          }),
        ),
      ).once();

      verify(mockNotificationService.sendNotification(anyString(), anything())).never();
    });

    it("should not send invite if employee exists and status is INVITED", async () => {
      const employer = getRandomEmployer("Fake Employer");
      employer.locale = "es";
      const employee = getRandomEmployeeWithoutConsumer(false);
      employee.employer = employer;
      const email = "fake+email@employer.com";
      employee.email = email;
      employee.status = EmployeeStatus.INVITED;

      when(employeeRepo.getActiveEmployeeByEmail(employee.email)).thenResolve(employee);
      const response = await employeeService.inviteEmployee(email, employer, true);

      expect(response).toStrictEqual({
        ...employee,
        status: EmployeeStatus.INVITED,
      });

      verify(
        employeeRepo.createEmployee(
          deepEqual({
            allocationAmount: 0,
            allocationCurrency: EmployeeAllocationCurrency.COP,
            employerID: employer.id,
            status: EmployeeStatus.CREATED,
            email: email,
          }),
        ),
      ).never();

      verify(mockNotificationService.sendNotification(anyString(), anything())).never();
      verify(employeeRepo.updateEmployee(employee.id, anything())).never();
    });
  });

  describe("updateEmployee", () => {
    it("should update an employee", async () => {
      const employee = getRandomEmployee(true);
      employee.allocationAmount = 200;

      employee.employer.maxAllocationPercent = 20;

      const newSalary = 100;

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        salary: newSalary,
        email: "rosie@noba.com",
      });

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: 20,
        salary: newSalary,
        email: "rosie@noba.com",
      });
    });

    it("should update an employee with consumerID and automatically update status", async () => {
      const employee = getRandomEmployeeWithoutConsumer(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve({
        ...employee,
        status: EmployeeStatus.LINKED,
      });

      const consumerID = uuid();
      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        consumerID: consumerID,
      });

      expect(updatedEmployee).toEqual({ ...employee, status: EmployeeStatus.LINKED });

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: 0,
        consumerID: consumerID,
        status: EmployeeStatus.LINKED,
      });
    });

    it("should update employee status", async () => {
      const employee = getRandomEmployee(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        status: EmployeeStatus.UNLINKED,
      });

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: employee.allocationAmount,
        status: EmployeeStatus.UNLINKED,
      });
    });

    it("should not allow a consumerID update when employee already has a different consumerID", async () => {
      const employee = getRandomEmployee(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);

      const consumerID = uuid();
      expect(
        employeeService.updateEmployee(employee.id, {
          consumerID: consumerID,
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should not allow an existing record to be updated with a status of CREATED", async () => {
      const employee = getRandomEmployee(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);

      expect(
        employeeService.updateEmployee(employee.id, {
          status: EmployeeStatus.CREATED,
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should not throw an error if updating employee with same consumerID", async () => {
      const employee = getRandomEmployee(true);

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const consumerID = employee.consumerID;
      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        consumerID: consumerID,
      });
      expect(updatedEmployee.consumerID).toEqual(consumerID);
    });

    it("should update an employee with new allocation amount based on new salary", async () => {
      const employee = getRandomEmployee(true);

      employee.employer.maxAllocationPercent = 20;
      const newAllocationAmount = 180;
      const newSalary = 1000;

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        allocationAmount: newAllocationAmount,
        salary: newSalary,
      });

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: newAllocationAmount,
        salary: newSalary,
      });
    });

    it("should update an employee with an explicit 0 allocation and salary", async () => {
      const employee = getRandomEmployee(true);

      employee.employer.maxAllocationPercent = 20;
      const newAllocationAmount = 0;
      const newSalary = 0;

      when(employeeRepo.getEmployeeByID(employee.id, true)).thenResolve(employee);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        allocationAmount: newAllocationAmount,
        salary: newSalary,
      });

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: newAllocationAmount,
        salary: newSalary,
      });
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      try {
        await employeeService.updateEmployee(undefined, {
          allocationAmount: 10.0,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("employeeID"));
      }

      try {
        await employeeService.updateEmployee(null, {
          allocationAmount: 10.0,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("employeeID"));
      }
    });
  });

  describe("getEmployeeByID", () => {
    it("should get an employee by ID", async () => {
      const employee = getRandomEmployee();
      when(employeeRepo.getEmployeeByID(anything(), anything())).thenResolve(employee);

      const retrievedEmployee = await employeeService.getEmployeeByID(employee.id);

      expect(retrievedEmployee).toEqual(employee);

      const employeeID = capture(employeeRepo.getEmployeeByID).last()[0];
      const shouldFetchEmployer = capture(employeeRepo.getEmployeeByID).last()[1];
      expect(employeeID).toEqual(employee.id);
      expect(shouldFetchEmployer).toBeUndefined();
    });

    it("should get an employee by ID with employer details", async () => {
      const employee = getRandomEmployee(true);
      when(employeeRepo.getEmployeeByID(anything(), anything())).thenResolve(employee);

      const retrievedEmployee = await employeeService.getEmployeeByID(employee.id, true);

      expect(retrievedEmployee).toEqual(employee);

      const employeeID = capture(employeeRepo.getEmployeeByID).last()[0];
      const shouldFetchEmployer = capture(employeeRepo.getEmployeeByID).last()[1];
      expect(employeeID).toEqual(employee.id);
      expect(shouldFetchEmployer).toBe(true);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employeeService.getEmployeeByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employeeService.getEmployeeByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployeesForConsumerID", () => {
    it("should get an employee by consumerID without employer details", async () => {
      const employee1 = getRandomEmployee();
      const employee2 = getRandomEmployee();
      employee2.consumerID = employee1.consumerID;

      when(employeeRepo.getEmployeesForConsumerID(anything(), false)).thenResolve([employee1, employee2]);

      const retrievedEmployee = await employeeService.getEmployeesForConsumerID(employee1.consumerID, false);

      expect(retrievedEmployee).toEqual(expect.arrayContaining([employee1, employee2]));

      const [consumerID] = capture(employeeRepo.getEmployeesForConsumerID).last();
      expect(consumerID).toEqual(employee1.consumerID);
      expect(retrievedEmployee[0].employer).toBeUndefined();
      expect(retrievedEmployee[1].employer).toBeUndefined();
    });

    it("should get an employee by consumerID with employer details", async () => {
      const employee1 = getRandomEmployee(true);
      const employee2 = getRandomEmployee(true);
      employee2.consumerID = employee1.consumerID;

      when(employeeRepo.getEmployeesForConsumerID(anything(), true)).thenResolve([employee1, employee2]);

      const retrievedEmployee = await employeeService.getEmployeesForConsumerID(employee1.consumerID, true);

      expect(retrievedEmployee).toEqual(expect.arrayContaining([employee1, employee2]));

      const [consumerID] = capture(employeeRepo.getEmployeesForConsumerID).last();
      expect(consumerID).toEqual(employee1.consumerID);
      expect(retrievedEmployee[0].employer).toBeDefined();
      expect(retrievedEmployee[1].employer).toBeDefined();
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employeeService.getEmployeesForConsumerID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employeeService.getEmployeesForConsumerID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployeeByConsumerAndEmployerID", () => {
    it("should get an employee by consumerID & employerID", async () => {
      const employee1 = getRandomEmployee();
      when(employeeRepo.getEmployeeByConsumerAndEmployerID(employee1.consumerID, employee1.employerID)).thenResolve(
        employee1,
      );

      const retrievedEmployee = await employeeService.getEmployeeByConsumerAndEmployerID(
        employee1.consumerID,
        employee1.employerID,
      );

      expect(retrievedEmployee).toEqual(employee1);
    });

    it("should throw ServiceException if the consumerID is undefined or null", async () => {
      try {
        await employeeService.getEmployeeByConsumerAndEmployerID(undefined, "employerID");
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'consumerID'"));
      }

      try {
        await employeeService.getEmployeeByConsumerAndEmployerID(null, "employerID");
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'consumerID'"));
      }
    });

    it("should throw ServiceException if the employerID is undefined or null", async () => {
      try {
        await employeeService.getEmployeeByConsumerAndEmployerID("consumerID", undefined);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'employerID'"));
      }

      try {
        await employeeService.getEmployeeByConsumerAndEmployerID("consumerID", null);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'employerID'"));
      }
    });
  });

  describe("getEmployeesForEmployer", () => {
    it("should get all employees for an employer", async () => {
      const employee = getRandomEmployee(true);
      when(employeeRepo.getEmployeesForEmployerWithConsumer(employee.employerID)).thenResolve([employee]);
      const employees = await employeeService.getEmployeesForEmployer(employee.employerID);
      expect(employees.length).toBe(1);
    });

    it("should throw an error if employerID is not supplied", async () => {
      expect(employeeService.getEmployeesForEmployer(undefined)).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });
  });

  describe("updateAllocationAmountsForNewMaxAllocationPercent", () => {
    it("should update the allocation amounts for all employees of an employer when max allocation percent changes", async () => {
      const employee1 = getRandomEmployee();
      const employee2 = getRandomEmployee();
      const employee3 = getRandomEmployee();

      const employer = createTestEmployer();
      employer.maxAllocationPercent = 20;

      employee1.salary = 1000;
      employee2.salary = 2000;
      employee3.salary = 3000;

      employee1.allocationAmount = 200;
      employee2.allocationAmount = 400;
      employee3.allocationAmount = 600;

      when(employeeRepo.getEmployeesForEmployerWithConsumer(employer.id)).thenResolve([
        employee1,
        employee2,
        employee3,
      ]);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve();

      await employeeService.updateAllocationAmountsForNewMaxAllocationPercent(employer.id, 10);

      const [employeeID1, employeeUpdateRequest1] = capture(employeeRepo.updateEmployee).first();
      const [employeeID2, employeeUpdateRequest2] = capture(employeeRepo.updateEmployee).second();
      const [employeeID3, employeeUpdateRequest3] = capture(employeeRepo.updateEmployee).third();

      verify(employeeRepo.updateEmployee(anything(), anything())).times(3);

      expect(employeeID1).toEqual(employee1.id);
      expect(employeeUpdateRequest1).toEqual({
        allocationAmount: 100,
      });

      expect(employeeID2).toEqual(employee2.id);
      expect(employeeUpdateRequest2).toEqual({
        allocationAmount: 200,
      });

      expect(employeeID3).toEqual(employee3.id);
      expect(employeeUpdateRequest3).toEqual({
        allocationAmount: 300,
      });
    });

    it("should update allocation amounts of only those employees which are exceeding as per new max allocation percent", async () => {
      const employee1 = getRandomEmployee();
      const employee2 = getRandomEmployee();
      const employee3 = getRandomEmployee();

      const employer = createTestEmployer();
      employer.maxAllocationPercent = 20;

      employee1.salary = 1000;
      employee2.salary = 2000;
      employee3.salary = 3000;

      employee1.allocationAmount = 200;
      employee2.allocationAmount = 400;
      employee3.allocationAmount = 200; // this employee is not exceeding the new max allocation percent

      when(employeeRepo.getEmployeesForEmployerWithConsumer(employer.id)).thenResolve([
        employee1,
        employee2,
        employee3,
      ]);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve();

      await employeeService.updateAllocationAmountsForNewMaxAllocationPercent(employer.id, 10);

      const [employeeID1, employeeUpdateRequest1] = capture(employeeRepo.updateEmployee).first();
      const [employeeID2, employeeUpdateRequest2] = capture(employeeRepo.updateEmployee).second();

      verify(employeeRepo.updateEmployee(anything(), anything())).times(2);

      expect(employeeID1).toEqual(employee1.id);
      expect(employeeUpdateRequest1).toEqual({
        allocationAmount: 100,
      });

      expect(employeeID2).toEqual(employee2.id);
      expect(employeeUpdateRequest2).toEqual({
        allocationAmount: 200,
      });
    });
  });

  describe("getFilteredEmployees", () => {
    it("should return paginated list of filtered employees", async () => {
      const employee1 = getRandomEmployee();

      const filter: EmployeeFilterOptionsDTO = {
        employerID: employee1.employerID,
        pageLimit: 5,
        pageOffset: 0,
      };
      when(employeeRepo.getFilteredEmployees(deepEqual(filter))).thenResolve({
        page: 1,
        hasNextPage: false,
        items: [employee1],
        totalItems: 1,
        totalPages: 1,
      });

      const result = await employeeService.getFilteredEmployees(filter);
      expect(result).toStrictEqual({
        page: 1,
        hasNextPage: false,
        items: [employee1],
        totalItems: 1,
        totalPages: 1,
      });
    });
  });
});
