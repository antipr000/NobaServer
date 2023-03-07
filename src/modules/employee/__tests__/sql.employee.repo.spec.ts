import { Test, TestingModule } from "@nestjs/testing";
import { Employee as PrismaEmployeeModel, Employer as PrismaEmployerModel } from "@prisma/client";
import { DatabaseInternalErrorException, NotFoundError } from "../../../core/exception/CommonAppException";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../../../modules/employer/test_utils/test.utils";
import { Employee, EmployeeAllocationCurrency, EmployeeCreateRequest } from "../domain/Employee";
import { IEmployeeRepo } from "../repo/employee.repo";
import { SqlEmployeeRepo } from "../repo/sql.employee.repo";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

type EmployeeModel = PrismaEmployeeModel & {
  employer?: PrismaEmployerModel;
};

const getAllEmployeeRecords = async (
  prismaService: PrismaService,
  fetchEmployerDetails?: boolean,
): Promise<EmployeeModel[]> => {
  return prismaService.employee.findMany({
    include: {
      employer: fetchEmployerDetails ?? false,
    },
  });
};

const getRandomEmployee = (employerID: string, consumerID: string): EmployeeCreateRequest => {
  const employee: EmployeeCreateRequest = {
    employerID: employerID,
    consumerID: consumerID,
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
  };

  return employee;
};

describe("SqlEmployeeRepoTests", () => {
  jest.setTimeout(20000);

  let employeeRepo: IEmployeeRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SqlEmployeeRepo],
    }).compile();

    employeeRepo = app.get<SqlEmployeeRepo>(SqlEmployeeRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  beforeEach(async () => {
    await prismaService.employee.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    // clear all the dependencies
    await prismaService.consumer.deleteMany();
    await prismaService.employer.deleteMany();
  });

  describe("createEmployee", () => {
    it("should create a new employee and auto-populate ID, createdTimestamp & updatedTimestamp", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      expect(createdEmployee.id).toBeDefined();
      expect(createdEmployee.createdTimestamp).toBeDefined();
      expect(createdEmployee.updatedTimestamp).toBeDefined();

      expect(createdEmployee.employerID).toEqual(employee.employerID);
      expect(createdEmployee.consumerID).toEqual(employee.consumerID);
      expect(createdEmployee.allocationAmount).toEqual(employee.allocationAmount);
      expect(createdEmployee.allocationCurrency).toEqual(employee.allocationCurrency);
      expect(createdEmployee.salary).toBeUndefined();
      expect(createdEmployee.employer).toBeUndefined();

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      delete savedEmployees[0].salary;
      expect(savedEmployees[0]).toEqual(createdEmployee);
    });

    it("should create a new employee with salary", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      employee.salary = 1000;

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      expect(createdEmployee.id).toBeDefined();
      expect(createdEmployee.createdTimestamp).toBeDefined();
      expect(createdEmployee.updatedTimestamp).toBeDefined();

      expect(createdEmployee.employerID).toEqual(employee.employerID);
      expect(createdEmployee.consumerID).toEqual(employee.consumerID);
      expect(createdEmployee.allocationAmount).toEqual(employee.allocationAmount);
      expect(createdEmployee.allocationCurrency).toEqual(employee.allocationCurrency);
      expect(createdEmployee.salary).toEqual(employee.salary);

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      expect(savedEmployees[0]).toEqual(createdEmployee);
    });

    it("should throw error if trying to create an Employee with same 'consumerID & employerID'", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee1);

      try {
        await employeeRepo.createEmployee(employee2);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.ALREADY_EXISTS);

        // IMPORTANT: shouldn't expose internal IDs at any cost :)
        expect(err.message).toEqual(expect.not.stringContaining(employee2.consumerID));
        expect(err.message).toEqual(expect.not.stringContaining(employee2.employerID));
      }
    });

    it("should throw error if the allocationCurrency is not correct", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      employee.allocationCurrency = "INVALID" as EmployeeAllocationCurrency;

      try {
        await employeeRepo.createEmployee(employee);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("allocationCurrency"));
      }
    });

    it("should throw error if the consumerID doesn't really exist", async () => {
      const consumerID = "INVALID";
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      await expect(employeeRepo.createEmployee(employee)).rejects.toThrowError(DatabaseInternalErrorException);
    });

    it("should throw error if the employerID doesn't really exist", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID = "INVALID";
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      await expect(employeeRepo.createEmployee(employee)).rejects.toThrowError(DatabaseInternalErrorException);
    });
  });

  describe("updateEmployee", () => {
    it("should update 'allocationAmount' of an existing employee", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const updatedEmployee: Employee = await employeeRepo.updateEmployee(createdEmployee.id, {
        allocationAmount: 10.1,
      });

      expect(updatedEmployee.id).toEqual(createdEmployee.id);
      expect(updatedEmployee.createdTimestamp).toEqual(createdEmployee.createdTimestamp);
      expect(updatedEmployee.updatedTimestamp).not.toEqual(createdEmployee.updatedTimestamp);

      expect(updatedEmployee.employerID).toEqual(createdEmployee.employerID);
      expect(updatedEmployee.consumerID).toEqual(createdEmployee.consumerID);
      expect(updatedEmployee.allocationAmount).toEqual(10.1);
      expect(updatedEmployee.allocationCurrency).toEqual(createdEmployee.allocationCurrency);
      expect(updatedEmployee.employer).toBeUndefined();

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      delete savedEmployees[0].salary;
      expect(savedEmployees[0]).toEqual(updatedEmployee);
    });

    it("should update 'allocationAmount' of an existing employee of 0", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const updatedEmployee: Employee = await employeeRepo.updateEmployee(createdEmployee.id, {
        allocationAmount: 0,
      });

      expect(updatedEmployee.id).toEqual(createdEmployee.id);
      expect(updatedEmployee.createdTimestamp).toEqual(createdEmployee.createdTimestamp);
      expect(updatedEmployee.updatedTimestamp).not.toEqual(createdEmployee.updatedTimestamp);

      expect(updatedEmployee.employerID).toEqual(createdEmployee.employerID);
      expect(updatedEmployee.consumerID).toEqual(createdEmployee.consumerID);
      expect(updatedEmployee.allocationAmount).toEqual(0);
      expect(updatedEmployee.allocationCurrency).toEqual(createdEmployee.allocationCurrency);
      expect(updatedEmployee.employer).toBeUndefined();

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      delete savedEmployees[0].salary;
      expect(savedEmployees[0]).toEqual(updatedEmployee);
    });

    it("should update 'salary' of an existing employee", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const updatedEmployee: Employee = await employeeRepo.updateEmployee(createdEmployee.id, {
        salary: 1000,
      });

      expect(updatedEmployee.id).toEqual(createdEmployee.id);
      expect(updatedEmployee.createdTimestamp).toEqual(createdEmployee.createdTimestamp);
      expect(updatedEmployee.updatedTimestamp).not.toEqual(createdEmployee.updatedTimestamp);

      expect(updatedEmployee.employerID).toEqual(createdEmployee.employerID);
      expect(updatedEmployee.consumerID).toEqual(createdEmployee.consumerID);
      expect(updatedEmployee.salary).toEqual(1000);
      expect(updatedEmployee.employer).toBeUndefined();

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      expect(savedEmployees[0]).toEqual(updatedEmployee);
    });

    it("should throw error if the allocationCurrency is not correct", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      try {
        await employeeRepo.updateEmployee(createdEmployee.id, {
          allocationCurrency: "INVALID" as EmployeeAllocationCurrency,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("allocationCurrency"));
      }
    });

    it("should throw NotFoundError if the employeeID doesn't really exist", async () => {
      const employeeID = "INVALID";

      await expect(
        employeeRepo.updateEmployee(employeeID, {
          allocationAmount: 100,
        }),
      ).rejects.toThrowError(NotFoundError);
    });
  });

  describe("getEmployeeByID", () => {
    it("should return the employee with the given ID", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const fetchedEmployee: Employee = await employeeRepo.getEmployeeByID(createdEmployee.id);

      expect(fetchedEmployee).toEqual(createdEmployee);
      expect(fetchedEmployee.employer).toBeUndefined();
    });

    it("should get employee with employer details when requested", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const fetchedEmployee: Employee = await employeeRepo.getEmployeeByID(createdEmployee.id, true);
      expect(fetchedEmployee.employer).toBeDefined();
      expect(fetchedEmployee.employer.id).toBe(employerID);
    });

    it("should throw 'null' if the employeeID doesn't really exist", async () => {
      const employeeID = "INVALID";
      expect(await employeeRepo.getEmployeeByID(employeeID)).toBeNull();
    });
  });

  describe("getEmployeesForConsumerID", () => {
    it("should return all employees for the specified consumerID 'only'", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const consumerID2: string = await createTestConsumer(prismaService);
      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const createdEmployee1: Employee = await employeeRepo.createEmployee(employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID1);
      const createdEmployee2: Employee = await employeeRepo.createEmployee(employee2);
      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID2);
      const createdEmployee3: Employee = await employeeRepo.createEmployee(employee3);

      const fetchedEmployeesForConsumerID1: Employee[] = await employeeRepo.getEmployeesForConsumerID(consumerID1);

      expect(fetchedEmployeesForConsumerID1.length).toEqual(2);
      expect(fetchedEmployeesForConsumerID1).toEqual(expect.arrayContaining([createdEmployee1, createdEmployee2]));

      const fetchedEmployeesForConsumerID2: Employee[] = await employeeRepo.getEmployeesForConsumerID(consumerID2);

      expect(fetchedEmployeesForConsumerID2.length).toEqual(1);
      expect(fetchedEmployeesForConsumerID2).toEqual(expect.arrayContaining([createdEmployee3]));
    });

    it("should return empty array if there is no Employee with the specified consumerID", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      expect(await employeeRepo.getEmployeesForConsumerID(consumerID)).toEqual([]);
    });
  });

  describe("getEmployeeByConsumerAndEmployerID", () => {
    it("should return the employee with the given consumerID and employerID", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const consumerID2: string = await createTestConsumer(prismaService);
      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const createdEmployee1: Employee = await employeeRepo.createEmployee(employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID1);
      const createdEmployee2: Employee = await employeeRepo.createEmployee(employee2);
      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID2);
      const createdEmployee3: Employee = await employeeRepo.createEmployee(employee3);

      const fetchedEmployee: Employee = await employeeRepo.getEmployeeByConsumerAndEmployerID(consumerID1, employerID2);

      expect(fetchedEmployee).toEqual(createdEmployee2);
    });

    it("should throw 'null' if the employee doesn't really exist", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      expect(await employeeRepo.getEmployeeByConsumerAndEmployerID(consumerID, employerID)).toBeNull();
    });
  });

  describe("getEmployeesForEmployer", () => {
    it("should return all employees for the specified employerID 'only'", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const consumerID2: string = await createTestConsumer(prismaService);
      const consumerID3: string = await createTestConsumer(prismaService);
      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const createdEmployee1: Employee = await employeeRepo.createEmployee(employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID2);
      const createdEmployee2: Employee = await employeeRepo.createEmployee(employee2);
      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID3);
      await employeeRepo.createEmployee(employee3);

      const fetchedEmployeesForEmployerID1: Employee[] = await employeeRepo.getEmployeesForEmployer(employerID1);

      expect(fetchedEmployeesForEmployerID1.length).toEqual(2);
      expect(fetchedEmployeesForEmployerID1).toEqual(expect.arrayContaining([createdEmployee1, createdEmployee2]));
    });
  });
});
