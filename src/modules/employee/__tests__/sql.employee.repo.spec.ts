import { Test, TestingModule } from "@nestjs/testing";
import {
  Employee as PrismaEmployeeModel,
  Employer as PrismaEmployerModel,
  Consumer as PrismaConsumerModel,
} from "@prisma/client";
import { DatabaseInternalErrorException, NotFoundError } from "../../../core/exception/CommonAppException";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../../../modules/employer/test_utils/test.utils";
import { Employee, EmployeeAllocationCurrency, EmployeeCreateRequest, EmployeeStatus } from "../domain/Employee";
import { IEmployeeRepo } from "../repo/employee.repo";
import { SqlEmployeeRepo } from "../repo/sql.employee.repo";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { PaginatedResult, SortOrder } from "../../../core/infra/PaginationTypes";

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

const getAllConsumerRecords = async (prismaService: PrismaService): Promise<PrismaConsumerModel[]> => {
  return prismaService.consumer.findMany({});
};

const getRandomEmployee = (employerID: string, consumerID: string): EmployeeCreateRequest => {
  const employee: EmployeeCreateRequest = {
    employerID: employerID,
    consumerID: consumerID,
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    status: EmployeeStatus.LINKED,
    email: `test-${Math.floor(Math.random() * 1000000)}@noba.com`,
  };

  return employee;
};

const getRandomEmployeeWithoutConsumer = (employerID: string): EmployeeCreateRequest => {
  const employee: EmployeeCreateRequest = {
    employerID: employerID,
    allocationAmount: 0,
    allocationCurrency: EmployeeAllocationCurrency.COP,
    status: EmployeeStatus.CREATED,
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
      expect(createdEmployee.status).toEqual(employee.status);
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
      expect(createdEmployee.status).toEqual(employee.status);
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

    it("should create a new employee without linking to consumer", async () => {
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployeeWithoutConsumer(employerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      expect(createdEmployee.id).toBeDefined();
      expect(createdEmployee.createdTimestamp).toBeDefined();
      expect(createdEmployee.updatedTimestamp).toBeDefined();

      expect(createdEmployee.employerID).toEqual(employee.employerID);
      expect(createdEmployee.consumerID).toBeNull();
      expect(createdEmployee.allocationAmount).toEqual(employee.allocationAmount);
      expect(createdEmployee.allocationCurrency).toEqual(employee.allocationCurrency);
      expect(createdEmployee.status).toEqual(employee.status);
      expect(createdEmployee.salary).toBeUndefined();
      expect(createdEmployee.employer).toBeUndefined();

      const savedEmployees: EmployeeModel[] = await getAllEmployeeRecords(prismaService);
      expect(savedEmployees.length).toEqual(1);
      delete savedEmployees[0].salary;
      expect(savedEmployees[0]).toEqual(createdEmployee);
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
      expect(updatedEmployee.status).toEqual(createdEmployee.status);
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
      expect(updatedEmployee.status).toEqual(createdEmployee.status);
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
      expect(updatedEmployee.status).toEqual(createdEmployee.status);

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

    it("should update an employee with a consumerID and allocationAmount", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      const employee: EmployeeCreateRequest = getRandomEmployeeWithoutConsumer(employerID);

      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      expect(createdEmployee.consumerID).toBeNull();
      expect(createdEmployee.allocationAmount).toEqual(0);

      const updatedEmployee = await employeeRepo.updateEmployee(createdEmployee.id, {
        consumerID: consumerID,
        allocationAmount: 100,
      });

      expect(updatedEmployee.consumerID).toEqual(consumerID);
      expect(updatedEmployee.allocationAmount).toEqual(100);
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

    it("should return empty array if there is no Employee with the specified employerID", async () => {
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      expect(await employeeRepo.getEmployeesForEmployer(employerID)).toEqual([]);
    });

    it("should throw error if findMany fails", async () => {
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      jest.spyOn(prismaService.employee, "findMany").mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      await expect(employeeRepo.getEmployeesForEmployer(employerID)).rejects.toThrowRepoException();
    });
  });

  describe("getEmployeesForEmployerWithConsumer", () => {
    it("should return all employees for the specified employerID with the consumer", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const consumerID2: string = await createTestConsumer(prismaService);
      const consumerID3: string = await createTestConsumer(prismaService);
      const consumerID4: string = await createTestConsumer(prismaService);
      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const createdEmployee1: Employee = await employeeRepo.createEmployee(employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID2);
      const createdEmployee2: Employee = await employeeRepo.createEmployee(employee2);

      const unlinkedEmployee: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID4);
      unlinkedEmployee.status = EmployeeStatus.UNLINKED;
      await employeeRepo.createEmployee(unlinkedEmployee);

      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID3);
      await employeeRepo.createEmployee(employee3);

      const fetchedEmployeesForEmployerID1: Employee[] = await employeeRepo.getEmployeesForEmployerWithConsumer(
        employerID1,
      );

      expect(fetchedEmployeesForEmployerID1.length).toEqual(2);
      expect(fetchedEmployeesForEmployerID1).toContainEqual({
        ...createdEmployee1,
        consumer: expect.any(Object),
      });
      expect(fetchedEmployeesForEmployerID1).toContainEqual({
        ...createdEmployee2,
        consumer: expect.any(Object),
      });

      const allConsumers = await getAllConsumerRecords(prismaService);
      const consumer1 = allConsumers.find(value => value.id === consumerID1);
      expect(fetchedEmployeesForEmployerID1[0].consumer.props).toStrictEqual({
        ...consumer1,
        verificationData: expect.any(Object),
      });

      const consumer2 = allConsumers.find(value => value.id === consumerID2);
      expect(fetchedEmployeesForEmployerID1[1].consumer.props).toStrictEqual({
        ...consumer2,
        verificationData: expect.any(Object),
      });
    });

    it("should return empty array if there is no Employee with the specified employerID", async () => {
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
      expect(await employeeRepo.getEmployeesForEmployerWithConsumer(employerID)).toEqual([]);
    });

    it("should throw error if findMany fails", async () => {
      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      jest.spyOn(prismaService.employee, "findMany").mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      await expect(employeeRepo.getEmployeesForEmployerWithConsumer(employerID)).rejects.toThrowRepoException();
    });
  });

  describe("getFilteredEmployees", () => {
    it("should return paginated list of filtered employees", async () => {
      const consumerID1: string = await createTestConsumer(prismaService, "Barry", "Allen");
      const consumerID2: string = await createTestConsumer(prismaService, "Bruce", "Wayne");
      const consumerID3: string = await createTestConsumer(prismaService, "Clark", "Kent");
      const consumerID4: string = await createTestConsumer(prismaService, "Diana", "Prince");
      const consumerID5: string = await createTestConsumer(prismaService, "Diego", "Forlan");
      const consumerID6: string = await createTestConsumer(prismaService, "Diego", "Maradona");
      const consumerID7: string = await createTestConsumer(prismaService, "Juan Danial", "Hoyon Castro");

      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const createdEmployee1: Employee = await employeeRepo.createEmployee(employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID2);
      const createdEmployee2: Employee = await employeeRepo.createEmployee(employee2);
      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID3);
      const createdEmployee3: Employee = await employeeRepo.createEmployee(employee3);
      const employee4: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID4);
      const createdEmployee4: Employee = await employeeRepo.createEmployee(employee4);
      const employee5: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID5);
      const createdEmployee5: Employee = await employeeRepo.createEmployee(employee5);

      const employee6: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID6);
      const createdEmployee6: Employee = await employeeRepo.createEmployee(employee6);
      const employee7: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID7);
      const createdEmployee7: Employee = await employeeRepo.createEmployee(employee7);

      // Filter by employerID1
      const filteredEmployees1: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        pageOffset: 0,
        pageLimit: 10,
      });

      expect(filteredEmployees1.items.length).toEqual(5);
      expect(filteredEmployees1.totalPages).toEqual(1);
      expect(filteredEmployees1.items.map(employee => employee.id)).toEqual(
        expect.arrayContaining([
          createdEmployee1.id,
          createdEmployee2.id,
          createdEmployee3.id,
          createdEmployee4.id,
          createdEmployee5.id,
        ]),
      );

      // Filter by employerID1 and partial firstName
      const filteredEmployees2: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        firstNameContains: "Di",
        pageLimit: 10,
        pageOffset: 0,
      });

      expect(filteredEmployees2.items.length).toEqual(2);
      expect(filteredEmployees2.totalPages).toEqual(1);
      expect(filteredEmployees2.items.map(employee => employee.id)).toEqual(
        expect.arrayContaining([createdEmployee4.id, createdEmployee5.id]),
      );

      // Filter by employerID1 and partial lastName
      const filteredEmployees3: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        lastNameContains: "W",
        pageLimit: 10,
        pageOffset: 0,
      });

      expect(filteredEmployees3.items.length).toEqual(1);
      expect(filteredEmployees3.totalPages).toEqual(1);
      expect(filteredEmployees3.items.map(employee => employee.id)).toEqual(
        expect.arrayContaining([createdEmployee2.id]),
      );

      // Filter by employerID2 and email
      const filteredEmployees4: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID2,
        employeeEmail: employee6.email,
        pageLimit: 10,
        pageOffset: 0,
      });

      expect(filteredEmployees4.items.length).toEqual(1);
      expect(filteredEmployees4.totalPages).toEqual(1);
      expect(filteredEmployees4.items.map(employee => employee.id)).toEqual(
        expect.arrayContaining([createdEmployee6.id]),
      );

      // Filter by employerID2 and email where email belongs to employee in employerID1
      const filteredEmployees5: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID2,
        employeeEmail: employee1.email,
        pageLimit: 10,
        pageOffset: 0,
      });

      expect(filteredEmployees5.items.length).toEqual(0);

      // Case insensitive substring search
      const filteredEmployees6: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID2,
        firstNameContains: "dan",
        lastNameContains: "cas",
      });

      expect(filteredEmployees6.items.length).toEqual(1);
      expect(filteredEmployees6.totalPages).toEqual(1);
      expect(filteredEmployees6.items[0].consumer.props.firstName).toEqual("Juan Danial");
      expect(filteredEmployees6.items[0].consumer.props.lastName).toEqual("Hoyon Castro");

      await prismaService.employee.update({
        where: {
          id: createdEmployee4.id,
        },
        data: {
          createdTimestamp: new Date("2020-01-01"),
          status: EmployeeStatus.UNLINKED,
        },
      });

      await prismaService.employee.update({
        where: {
          id: createdEmployee5.id,
        },
        data: {
          createdTimestamp: new Date("2020-01-02"),
          status: EmployeeStatus.CREATED,
        },
      });

      // Filter by status
      const filteredEmployees10: PaginatedResult<Employee> = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        status: EmployeeStatus.UNLINKED,
        pageLimit: 10,
        pageOffset: 0,
      });

      expect(filteredEmployees10.items.length).toEqual(1);
      expect(filteredEmployees10.totalPages).toEqual(1);
      expect(filteredEmployees10.items[0].id).toEqual(createdEmployee4.id);

      // Ordering tests

      const filteredEmployees7 = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        pageLimit: 10,
        pageOffset: 0,
        createdTimestamp: SortOrder.ASC,
      });

      expect(filteredEmployees7.items.length).toEqual(5);
      expect(filteredEmployees7.items[0].id).toBe(createdEmployee4.id);
      expect(filteredEmployees7.items[1].id).toBe(createdEmployee5.id);

      const filteredEmployees8 = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        pageLimit: 10,
        pageOffset: 0,
        createdTimestamp: SortOrder.DESC,
      });

      expect(filteredEmployees8.items.length).toEqual(5);
      expect(filteredEmployees8.items[4].id).toBe(createdEmployee4.id);
      expect(filteredEmployees8.items[3].id).toBe(createdEmployee5.id);

      const filteredEmployees9 = await employeeRepo.getFilteredEmployees({
        employerID: employerID1,
        pageLimit: 10,
        pageOffset: 0,
        sortStatus: SortOrder.ASC,
      });

      expect(filteredEmployees9.items.length).toEqual(5);
      expect(filteredEmployees9.items[0].id).toBe(createdEmployee5.id); // status = CREATED
      expect(filteredEmployees9.items[4].id).toBe(createdEmployee4.id); // status = UNLINKED
    });
  });

  describe("getActiveEmployeeByEmail", () => {
    it("should return the active employee with the given email", async () => {
      const consumerID: string = await createTestConsumer(prismaService);

      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const activeEmployee: Employee = await employeeRepo.getActiveEmployeeByEmail(createdEmployee.email);

      expect(activeEmployee.id).toEqual(createdEmployee.id);
    });

    it("should return null if no active employee with the given email exists", async () => {
      const consumerID: string = await createTestConsumer(prismaService);

      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      await employeeRepo.updateEmployee(createdEmployee.id, {
        status: EmployeeStatus.UNLINKED,
      });

      const activeEmployee: Employee = await employeeRepo.getActiveEmployeeByEmail(createdEmployee.email);

      expect(activeEmployee).toBeNull();
    });

    it("should return employee with email null", async () => {
      const consumerID: string = await createTestConsumer(prismaService);

      const employerID: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee: EmployeeCreateRequest = getRandomEmployee(employerID, consumerID);
      delete employee.email;
      const createdEmployee: Employee = await employeeRepo.createEmployee(employee);

      const activeEmployee: Employee = await employeeRepo.getActiveEmployeeByEmail(undefined);

      expect(activeEmployee.id).toEqual(createdEmployee.id);
    });
  });
});
