import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Employee, EmployeeAllocationCurrency } from "../domain/Employee";
import { IEmployeeRepo } from "../repo/employee.repo";
import { getMockEmployeeRepoWithDefaults } from "../mocks/mock.employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "../repo/employee.repo.module";
import { anything, capture, instance, when } from "ts-mockito";
import { EmployeeService } from "../employee.service";
import { uuid } from "uuidv4";
import { ServiceException } from "../../../core/exception/service.exception";

const getRandomEmployee = (): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: uuid(),
    consumerID: uuid(),
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employee;
};

describe("EmployeeServiceTests", () => {
  jest.setTimeout(20000);

  let employeeRepo: IEmployeeRepo;
  let app: TestingModule;
  let employeeService: EmployeeService;

  beforeEach(async () => {
    employeeRepo = getMockEmployeeRepoWithDefaults();

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
      const employee = getRandomEmployee();
      const newAllocationAmount = Math.floor(Math.random() * 1000000);
      when(employeeRepo.updateEmployee(anything(), anything())).thenResolve(employee);

      const updatedEmployee = await employeeService.updateEmployee(employee.id, newAllocationAmount);

      expect(updatedEmployee).toEqual(employee);

      const [employeeID, propagatedEmployeeUpdateRequest] = capture(employeeRepo.updateEmployee).last();
      expect(employeeID).toEqual(employee.id);
      expect(propagatedEmployeeUpdateRequest).toEqual({
        allocationAmount: newAllocationAmount,
      });
    });

    it("should throw an error if allocationAmount is undefined", async () => {
      const employee = getRandomEmployee();

      try {
        await employeeService.updateEmployee(employee.id, undefined);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("allocationAmount"));
      }
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      try {
        await employeeService.updateEmployee(undefined, 10.0);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("employeeID"));
      }

      try {
        await employeeService.updateEmployee(null, 100.0);
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
      when(employeeRepo.getEmployeeByID(anything())).thenResolve(employee);

      const retrievedEmployee = await employeeService.getEmployeeByID(employee.id);

      expect(retrievedEmployee).toEqual(employee);

      const [employeeID] = capture(employeeRepo.getEmployeeByID).last();
      expect(employeeID).toEqual(employee.id);
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
});
