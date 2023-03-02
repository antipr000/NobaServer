import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Employee, EmployeeAllocationCurrency } from "../domain/Employee";
import { IEmployeeRepo } from "../repo/employee.repo";
import { getMockEmployeeRepoWithDefaults } from "../mocks/mock.employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "../repo/employee.repo.module";
import { anything, capture, instance, verify, when } from "ts-mockito";
import { EmployeeService } from "../employee.service";
import { uuid } from "uuidv4";
import { ServiceException } from "../../../core/exception/service.exception";
import { createTestEmployer } from "../../../modules/employer/test_utils/test.utils";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";

const getRandomEmployee = (includeEmployer?: boolean): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: uuid(),
    consumerID: uuid(),
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    ...(includeEmployer && { employer: createTestEmployer() }),
  };

  return employee;
};

describe("EmployeeServiceTests", () => {
  jest.setTimeout(20000);

  let employeeRepo: IEmployeeRepo;
  let app: TestingModule;
  let employerService: EmployerService;
  let employeeService: EmployeeService;

  beforeEach(async () => {
    employeeRepo = getMockEmployeeRepoWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();

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
          provide: EmployerService,
          useFactory: () => instance(employerService),
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
    it("should create an employee and 'always' send the 'COP' as allocationCurrency", async () => {
      const employee = getRandomEmployee();
      when(employeeRepo.createEmployee(anything())).thenResolve(employee);

      const createdEmployee = await employeeService.createEmployee(
        employee.allocationAmount,
        employee.employerID,
        employee.consumerID,
      );

      expect(createdEmployee).toEqual(employee);

      const [propagatedEmployeeCreateRequest] = capture(employeeRepo.createEmployee).last();
      expect(propagatedEmployeeCreateRequest).toEqual({
        allocationAmount: employee.allocationAmount,
        allocationCurrency: EmployeeAllocationCurrency.COP,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
      });
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
      });

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: 20,
        salary: newSalary,
      });
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

  describe("getEmployeeByConsumerID", () => {
    it("should get an employee by consumerID", async () => {
      const employee1 = getRandomEmployee();
      const employee2 = getRandomEmployee();
      employee2.consumerID = employee1.consumerID;

      when(employeeRepo.getEmployeesForConsumerID(anything())).thenResolve([employee1, employee2]);

      const retrievedEmployee = await employeeService.getEmployeesForConsumerID(employee1.consumerID);

      expect(retrievedEmployee).toEqual(expect.arrayContaining([employee1, employee2]));

      const [consumerID] = capture(employeeRepo.getEmployeesForConsumerID).last();
      expect(consumerID).toEqual(employee1.consumerID);
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

      when(employeeRepo.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2, employee3]);
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

      when(employeeRepo.getEmployeesForEmployer(employer.id)).thenResolve([employee1, employee2, employee3]);
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
});
